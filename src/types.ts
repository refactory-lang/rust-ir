/**
 * Shared types for the rust-ir library.
 *
 * All IR nodes are plain TypeScript objects (discriminated union).
 * The `kind` field matches the corresponding tree-sitter-rust grammar node
 * type name exactly (per Constitution Principle I: Grammar Fidelity).
 */

import type RustTypes from '@codemod.com/jssg-types/langs/rust';
import type { Kinds } from '@codemod.com/jssg-types/main';
import type { OptionalKeysOf, RequiredKeysOf, SetOptional, Simplify } from 'type-fest';

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

type SlotValue<Info> = Info extends { multiple: true }
  ? RustTextBrand<SlotKinds<Info>>[]
  : RustTextBrand<SlotKinds<Info>>;

type RustFieldMap<K extends RustNodeKind> = RustGrammar[K] extends { fields: infer Fields }
  ? Fields
  : never;

type RustFieldName<K extends RustNodeKind> = keyof RustFieldMap<K> & string;

type RustFieldInfo<
  K extends RustNodeKind,
  F extends RustFieldName<K>
> = Extract<RustFieldMap<K>[F], GrammarSlotInfo>;

type RequiredRustFieldName<K extends RustNodeKind> = {
  [F in RustFieldName<K>]: RustFieldInfo<K, F>['required'] extends true ? F : never;
}[RustFieldName<K>];

type OptionalRustFieldName<K extends RustNodeKind> = Exclude<RustFieldName<K>, RequiredRustFieldName<K>>;

type RustFieldKinds<
  K extends RustNodeKind,
  F extends RustFieldName<K>
> = SlotKinds<RustFieldInfo<K, F>>;

type RustChildrenInfo<K extends RustNodeKind> = RustGrammar[K] extends { children: infer Children }
  ? Extract<Children, GrammarSlotInfo>
  : never;

type DerivedNodeFields<K extends RustNodeKind> = {
  [F in RequiredRustFieldName<K>]: SlotValue<RustFieldInfo<K, F>>;
} & {
  [F in OptionalRustFieldName<K>]?: SlotValue<RustFieldInfo<K, F>>;
};

type DerivedNodeChildren<K extends RustNodeKind> = [RustChildrenInfo<K>] extends [never]
  ? {}
  : RustChildrenInfo<K>['required'] extends true
    ? { children: SlotValue<RustChildrenInfo<K>> }
    : { children?: SlotValue<RustChildrenInfo<K>> };

type DerivedNodeShape<K extends RustNodeKind> = DerivedNodeFields<K> & DerivedNodeChildren<K>;

type BuilderInputValue<T> = T extends { kind: RustNodeKind }
  ? T
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

type OptionalKeyOf<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never;
}[keyof T];

type RequiredKeyOf<T> = Exclude<keyof T, OptionalKeyOf<T>>;

export type RustNodeText<K extends RustNodeKind> = RustTextBrand<K>;

export type RustFieldText<
  K extends RustNodeKind,
  F extends RustFieldName<K>
> = RustTextBrand<RustFieldKinds<K, F>>;

type ResolveRustShape<K extends RustNodeKind, Shape> =
  Shape extends { kind: RustNodeKind }
    ? Shape
    : Shape extends RustTextBrand<string>
      ? Shape
    : Shape extends RustFieldName<K>
      ? RustFieldText<K, Shape>
    : Shape extends readonly (infer U)[]
      ? ResolveRustShape<K, U>[]
      : Shape extends object
        ? {
            [P in RequiredKeyOf<Shape>]: ResolveRustShape<K, Shape[P]>;
          } & {
            [P in OptionalKeyOf<Shape>]?: ResolveRustShape<K, Shape[P]>;
          }
        : Shape;

export type NodeBuilderInput<T extends { kind: RustNodeKind }> = Simplify<{
  [K in Exclude<Extract<RequiredKeysOf<T>, keyof T>, 'kind'>]: BuilderInputValue<T[K]>;
} & {
  [K in Exclude<Extract<OptionalKeysOf<T>, keyof T>, 'kind'>]?: BuilderInputValue<T[K]>;
}>;

export type DefaultableBuilderFieldName =
  | 'fields'
  | 'derives'
  | 'visibility'
  | 'params'
  | 'returnType'
  | 'trait'
  | 'methods'
  | 'elseIfClauses'
  | 'elseClause';

type DefaultableKeys<T extends { kind: RustNodeKind }> = Extract<
  keyof NodeBuilderInput<T>,
  DefaultableBuilderFieldName
>;

export type BuilderConfig<
  T extends { kind: RustNodeKind },
  OptionalKeys extends keyof NodeBuilderInput<T> = DefaultableKeys<T>
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

export type NodeType<
  K extends RustNodeKind,
  Shape extends object = DerivedNodeShape<K>
> = Readonly<{ kind: K }> & ResolveRustShape<K, Shape>;

/** A single named field in a Rust struct (`field_declaration`). */
export type FieldDeclaration = ResolveRustShape<'field_declaration', {
  name: 'name';
  type: 'type';
}>;

/** A single function parameter (`parameter`). */
export type ParameterDeclaration = ResolveRustShape<'parameter', {
  name: 'pattern';
  type: 'type';
}>;

/** An `else if` branch in an if-expression. */
export type ElseIfClause = ResolveRustShape<'if_expression', {
  condition: 'condition';
  consequence: 'consequence';
}>;

// ---------------------------------------------------------------------------
// IR Node types  (discriminated union — `kind` is the discriminant)
// ---------------------------------------------------------------------------

/** Rust `struct` declaration. tree-sitter node: `struct_item` */
export type StructItem = NodeType<'struct_item', {
  name: 'name';
  fields: FieldDeclaration[];
  derives: string[];
  visibility: Visibility;
}>;

/** Rust free function or method. tree-sitter node: `function_item` */
export type FunctionItem = NodeType<'function_item', {
  name: 'name';
  returnType: 'return_type';
  body: 'body';
  params: ParameterDeclaration[];
  visibility: Visibility;
}>;

/** Rust `use` declaration. tree-sitter node: `use_declaration` */
export type UseDeclaration = NodeType<'use_declaration'>;

/** Rust `impl` block. tree-sitter node: `impl_item` */
export type ImplItem = NodeType<'impl_item', {
  type: 'type';
  trait: 'trait';
  methods: FunctionItem[];
}>;

/** Rust `if` / `else if` / `else` expression. tree-sitter node: `if_expression` */
export type IfExpression = NodeType<'if_expression', {
  condition: 'condition';
  consequence: 'consequence';
  elseIfClauses: ElseIfClause[];
  elseClause: RustNodeText<'else_clause'> | undefined;
}>;

/** Rust macro invocation. tree-sitter node: `macro_invocation` */
export type MacroInvocation = NodeType<'macro_invocation', {
  macro: 'macro';
  tokens: RustNodeText<'token_tree'>;
}>;

/** A complete Rust source file. tree-sitter node: `source_file` */
export type SourceFile = NodeType<'source_file', {
  items: RustIrNode[];
}>;

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
