/**
 * Shared types for the rust-ir library.
 *
 * All IR nodes are plain TypeScript objects (discriminated union).
 * The `kind` field matches the corresponding tree-sitter-rust grammar node
 * type name exactly (per Constitution Principle I: Grammar Fidelity).
 *
 * Every node shape is derived 100% from the grammar — zero hand-rolled
 * field definitions.  Field names are CamelCase-converted automatically
 * (e.g. `return_type` → `returnType`) with an optional ergonomic alias
 * map for readability (e.g. `pattern` → `name` on `parameter`).
 */

import type RustTypes from '@codemod.com/jssg-types/langs/rust';
import type { Kinds } from '@codemod.com/jssg-types/main';
import type {
	CamelCase,
	OptionalKeysOf,
	RequiredKeysOf,
	SetOptional,
	Simplify,
	SimplifyDeep,
} from 'type-fest';

// ---------------------------------------------------------------------------
// Grammar primitives
// ---------------------------------------------------------------------------

export type RustGrammar = RustTypes;
export type RustNodeKind = keyof RustGrammar & string;
export type RustNamedKind = Kinds<RustGrammar>;

type RustTextBrand<K extends string> = string & {
	readonly __rustKinds: K;
};

type GrammarTypeRef = {
	readonly type: string;
};

type GrammarSlotInfo = {
	readonly multiple: boolean;
	readonly required: boolean;
	readonly types: readonly GrammarTypeRef[];
};

type SlotKinds<Info> = Info extends { types: infer Types extends readonly GrammarTypeRef[] }
	? Extract<Types[number]['type'], string>
	: never;

// ---------------------------------------------------------------------------
// Cycle-detected recursion  (visited-set pattern)
//
// Instead of a fixed depth limit, we track which node kinds have already
// been expanded in a tuple used as a set.  When a kind appears that is
// already in the visited set we've found a cycle and emit a branded-string
// leaf instead of recursing further.  This gives maximal expansion with
// natural termination.
// ---------------------------------------------------------------------------

/** Check if string literal T is already in the Visited tuple. */
type Contains<Visited extends string[], T extends string> = Visited extends [
	infer Head extends string,
	...infer Rest extends string[],
]
	? Head extends T
		? true
		: Contains<Rest, T>
	: false;

/** Branded-string leaf for a single kind. */
type LeafBrand<K extends string> = RustTextBrand<K>;

/**
 * Expand a single child kind into a structured node or a branded-string leaf.
 * Uses the visited set for cycle detection.
 */
type ExpandOneKind<K extends string, Visited extends string[]> = K extends RustNodeKind
	? RustGrammar[K] extends { fields: object }
		? Contains<Visited, K> extends true
			? LeafBrand<K> // cycle detected → stop
			: ExpandNode<K, Visited> // expand structurally
		: LeafBrand<K> // no fields → leaf
	: LeafBrand<K>; // not a grammar node → leaf

/**
 * Expand a grammar slot into structured nodes, stopping at cycles.
 *
 * Distributes over every child kind individually (via conditional type
 * distribution on `K extends ...`) so that concrete nodes with `fields`
 * expand into structured objects while abstract supertypes without
 * `fields` become branded-string leaves.
 */
type ExpandSlot<Info, Visited extends string[]> = Info extends { multiple: true }
	? ExpandOneKind<SlotKinds<Info>, Visited>[]
	: ExpandOneKind<SlotKinds<Info>, Visited>;

// ---------------------------------------------------------------------------
// Grammar field extraction
// ---------------------------------------------------------------------------

type RustFieldMap<K extends RustNodeKind> = RustGrammar[K] extends { fields: infer Fields }
	? Fields
	: never;

type RustFieldName<K extends RustNodeKind> = keyof RustFieldMap<K> & string;

type RustFieldInfo<K extends RustNodeKind, F extends RustFieldName<K>> = Extract<
	RustFieldMap<K>[F],
	GrammarSlotInfo
>;

type RequiredRustFieldName<K extends RustNodeKind> = {
	[F in RustFieldName<K>]: RustFieldInfo<K, F>['required'] extends true ? F : never;
}[RustFieldName<K>];

type OptionalRustFieldName<K extends RustNodeKind> = Exclude<
	RustFieldName<K>,
	RequiredRustFieldName<K>
>;

type RustFieldKinds<K extends RustNodeKind, F extends RustFieldName<K>> = SlotKinds<
	RustFieldInfo<K, F>
>;

type RustChildrenInfo<K extends RustNodeKind> = RustGrammar[K] extends { children: infer Children }
	? Extract<Children, GrammarSlotInfo>
	: never;

// ---------------------------------------------------------------------------
// Ergonomic alias map — per-kind field rename overrides
// Maps from grammar field names to ergonomic API names.
// Adding an entry here renames the derived field in the IR type.
// ---------------------------------------------------------------------------

type FieldAliasMap = {
	parameter: { pattern: 'name' };
};

/**
 * Resolve the output key for a given (kind, field_name) pair.
 * If FieldAliasMap has an entry, use the alias; otherwise CamelCase.
 */
type ResolveFieldKey<K extends RustNodeKind, F extends string> = K extends keyof FieldAliasMap
	? F extends keyof FieldAliasMap[K]
		? FieldAliasMap[K][F] & string
		: CamelCase<F>
	: CamelCase<F>;

// ---------------------------------------------------------------------------
// Grammar-derived node shapes  (CamelCase keys + alias map)
//
// Depth-aware: fields and children are recursively expanded via
// ExpandSlot until the depth tuple is exhausted.
// ---------------------------------------------------------------------------

type DerivedNodeFields<K extends RustNodeKind, Visited extends string[]> = {
	[F in RequiredRustFieldName<K> as ResolveFieldKey<K, F>]: ExpandSlot<
		RustFieldInfo<K, F>,
		Visited
	>;
} & {
	[F in OptionalRustFieldName<K> as ResolveFieldKey<K, F>]?: ExpandSlot<
		RustFieldInfo<K, F>,
		Visited
	>;
};

type DerivedNodeChildren<K extends RustNodeKind, Visited extends string[]> = [
	RustChildrenInfo<K>,
] extends [never]
	? {}
	: RustChildrenInfo<K>['required'] extends true
		? { children: ExpandSlot<RustChildrenInfo<K>, Visited> }
		: { children?: ExpandSlot<RustChildrenInfo<K>, Visited> };

type DerivedNodeShape<K extends RustNodeKind, Visited extends string[] = []> = DerivedNodeFields<
	K,
	[...Visited, K]
> &
	DerivedNodeChildren<K, [...Visited, K]>;

/**
 * Recursively expanded grammar node.  Used by ExpandSlot to build
 * child structures — carries `kind` + all grammar-derived fields.
 */
type ExpandNode<K extends RustNodeKind, Visited extends string[]> = Readonly<{ kind: K }> &
	DerivedNodeShape<K, Visited>;

// ---------------------------------------------------------------------------
// Builder input helpers
// ---------------------------------------------------------------------------

type BuilderInputValue<T> = T extends { kind: RustNodeKind }
	? T | string
	: T extends readonly (infer U)[]
		? BuilderInputValue<U>[]
		: T extends RustTextBrand<string>
			? string
			: T extends string
				? string extends T
					? string
					: T
				: T extends object
					? { [K in keyof T]: BuilderInputValue<T[K]> }
					: T;

// Hand-rolled key helpers for BuilderInputValue only.
type OptionalKeyOf<T> = {
	[K in keyof T]-?: {} extends Pick<T, K> ? K : never;
}[keyof T];

type RequiredKeyOf<T> = Exclude<keyof T, OptionalKeyOf<T>>;

export type RustNodeText<K extends RustNodeKind> = RustTextBrand<K>;

export type RustFieldText<K extends RustNodeKind, F extends RustFieldName<K>> = RustTextBrand<
	RustFieldKinds<K, F>
>;

export type NodeBuilderInput<T extends { kind: RustNodeKind }> = Simplify<
	{
		[K in Exclude<Extract<RequiredKeysOf<T>, keyof T>, 'kind'>]: BuilderInputValue<T[K]>;
	} & {
		[K in Exclude<Extract<OptionalKeysOf<T>, keyof T>, 'kind'>]?: BuilderInputValue<T[K]>;
	}
>;

/**
 * Grammar-derived field names that get builder defaults (empty arrays,
 * undefined optionals, etc.).  All names are CamelCase conversions of
 * grammar field names or alias-map overrides.
 */
export type DefaultableBuilderFieldName =
	| 'body'
	| 'typeParameters'
	| 'children'
	| 'returnType'
	| 'parameters'
	| 'trait'
	| 'alternative';

type DefaultableKeys<T extends { kind: RustNodeKind }> = Extract<
	keyof NodeBuilderInput<T>,
	DefaultableBuilderFieldName
>;

export type BuilderConfig<
	T extends { kind: RustNodeKind },
	OptionalKeys extends keyof NodeBuilderInput<T> = DefaultableKeys<T>,
> = Simplify<
	SetOptional<
		NodeBuilderInput<T>,
		Extract<
			OptionalKeys | Extract<OptionalKeysOf<NodeBuilderInput<T>>, keyof NodeBuilderInput<T>>,
			keyof NodeBuilderInput<T>
		>
	>
>;

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

/** Rust visibility modifier. `undefined` = no modifier (crate-private). */
export type Visibility = 'pub' | undefined;

export type NodeType<K extends RustNodeKind, Visited extends string[] = []> = SimplifyDeep<
	Readonly<{ kind: K }> & DerivedNodeShape<K, Visited>
>;

// ---------------------------------------------------------------------------
// Helper aliases — grammar-direct, zero hand-rolled fields
// ---------------------------------------------------------------------------

/** A single named field in a Rust struct (`field_declaration`). */
export type FieldDeclaration = NodeType<'field_declaration'>;

/** A single function parameter (`parameter`). */
export type ParameterDeclaration = NodeType<'parameter'>;

// ---------------------------------------------------------------------------
// IR Node types  (discriminated union — `kind` is the discriminant)
// All shapes are 100% grammar-derived via NodeType<K>.
// ---------------------------------------------------------------------------

/** Rust `struct` declaration. tree-sitter node: `struct_item` */
export type StructItem = NodeType<'struct_item'>;

/** Rust free function or method. tree-sitter node: `function_item` */
export type FunctionItem = NodeType<'function_item'>;

/** Rust `use` declaration. tree-sitter node: `use_declaration` */
export type UseDeclaration = NodeType<'use_declaration'>;

/** Rust `impl` block. tree-sitter node: `impl_item` */
export type ImplItem = NodeType<'impl_item'>;

/** Rust `if` / `else if` / `else` expression. tree-sitter node: `if_expression` */
export type IfExpression = NodeType<'if_expression'>;

/** Rust macro invocation. tree-sitter node: `macro_invocation` */
export type MacroInvocation = NodeType<'macro_invocation'>;

/** A complete Rust source file. tree-sitter node: `source_file` */
export type SourceFile = NodeType<'source_file'>;

/** Discriminated union of all supported IR node kinds. */
export type RustIrNode =
	| StructItem
	| FunctionItem
	| UseDeclaration
	| ImplItem
	| IfExpression
	| MacroInvocation
	| SourceFile;

export type StructItemConfig = BuilderConfig<StructItem>;
export type FunctionItemConfig = BuilderConfig<FunctionItem>;
export type UseDeclarationConfig = BuilderConfig<UseDeclaration>;
export type ImplItemConfig = BuilderConfig<ImplItem>;
export type IfExpressionConfig = BuilderConfig<IfExpression>;
export type MacroInvocationConfig = BuilderConfig<MacroInvocation>;
export type SourceFileConfig = BuilderConfig<SourceFile>;

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type ValidationResult =
	| { ok: true }
	| { ok: false; errors: Array<{ offset: number; kind: 'ERROR' }> };
