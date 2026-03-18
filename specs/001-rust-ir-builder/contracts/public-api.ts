/**
 * Public API Contract — rust-ir
 *
 * This file is the normative TypeScript interface for the `rust-ir` library.
 * It describes every exported type, factory function, and primary operation.
 * Implementations in `src/` MUST satisfy this contract exactly.
 *
 * Module: ESM (`"type": "module"`)
 * Entry: `src/index.ts`
 * Compatibility: Codemod JSSG runtime, Node.js ≥ 18 (tests/dev)
 *
 * AMENDMENT (2026-03-18): All IR node shapes are now 100% grammar-derived
 * from `@codemod.com/jssg-types` via `NodeType<K>`.  Hand-rolled interfaces
 * (FieldDeclaration[], ParameterDeclaration[], ElseIfClause[], derives,
 * visibility, path/items, methods, tokens, elseIfClauses) were replaced
 * by grammar-direct field names (body, children, parameters, argument,
 * alternative, etc.).  See Session 2026-03-16 in spec.md for rationale.
 */

// ---------------------------------------------------------------------------
// Shared primitives (grammar-derived)
// ---------------------------------------------------------------------------

/**
 * A single named field in a Rust struct.
 * Grammar-derived via `NodeType<'field_declaration'>`.
 */
export type FieldDeclaration = import('../../src/types.js').FieldDeclaration;

/**
 * A single function parameter.
 * Grammar-derived via `NodeType<'parameter'>`.
 */
export type ParameterDeclaration = import('../../src/types.js').ParameterDeclaration;

// ---------------------------------------------------------------------------
// IR Node types  (discriminated union — `kind` is the discriminant)
//
// All shapes are 100% grammar-derived via NodeType<K>.
// Field names are CamelCase-converted from grammar snake_case names
// with alias overrides defined in FieldAliasMap.
// ---------------------------------------------------------------------------

/**
 * Rust `struct` declaration.
 * tree-sitter-rust node: `struct_item`
 *
 * Grammar-derived fields:
 * - `name`: struct identifier (required)
 * - `body`: struct field block as string (optional — omit for unit struct)
 * - `typeParameters`: generic parameters (optional)
 * - `children`: visibility modifier, e.g. `['pub']` (optional)
 */
export type StructItem = import('../../src/types.js').StructItem;

/**
 * Rust free function or method.
 * tree-sitter-rust node: `function_item`
 *
 * Grammar-derived fields:
 * - `name`: function identifier (required)
 * - `body`: function block body as string (required)
 * - `parameters`: parameter list as string (optional)
 * - `returnType`: return type string (optional — omit to elide `-> Type`)
 * - `typeParameters`: generic parameters (optional)
 * - `children`: visibility modifier (optional)
 */
export type FunctionItem = import('../../src/types.js').FunctionItem;

/**
 * Rust `use` declaration.
 * tree-sitter-rust node: `use_declaration`
 *
 * Grammar-derived fields:
 * - `argument`: full use path as string, e.g. `"std::collections::HashMap"` (required)
 */
export type UseDeclaration = import('../../src/types.js').UseDeclaration;

/**
 * Rust `impl` block.
 * tree-sitter-rust node: `impl_item`
 *
 * Grammar-derived fields:
 * - `type`: type being implemented (required)
 * - `trait`: trait being implemented (optional — omit for inherent impl)
 * - `body`: impl body — pre-rendered string, single IR node, or array of IR nodes (optional)
 * - `typeParameters`: generic parameters (optional)
 * - `children`: visibility modifier (optional)
 */
export type ImplItem = import('../../src/types.js').ImplItem;

/**
 * Rust `if` / `else if` / `else` expression.
 * tree-sitter-rust node: `if_expression`
 *
 * Grammar-derived fields:
 * - `condition`: raw Rust boolean expression (required)
 * - `consequence`: block body expression (required)
 * - `alternative`: else clause — string or nested `render(ifExpression(...))` for else-if chains (optional)
 */
export type IfExpression = import('../../src/types.js').IfExpression;

/**
 * Rust macro invocation.
 * tree-sitter-rust node: `macro_invocation`
 *
 * Grammar-derived fields:
 * - `macro`: macro name without `!` (required)
 * - `children`: raw token tree content as string (required).
 *   Delimiter style is auto-detected: prefix `[` → `![]`, prefix `{` → `!{}`,
 *   otherwise `!()`.  E.g. `children: '[1, 2]'` renders `vec![1, 2]`.
 */
export type MacroInvocation = import('../../src/types.js').MacroInvocation;

/**
 * A complete Rust source file containing top-level items.
 * tree-sitter-rust node: `source_file`
 *
 * Grammar-derived fields:
 * - `children`: array of pre-rendered item strings or IR nodes (required, non-empty)
 */
export type SourceFile = import('../../src/types.js').SourceFile;

/**
 * Discriminated union of all supported IR node kinds.
 * Exhaustive switch on `node.kind` is guaranteed by TypeScript.
 */
export type RustIrNode =
	| StructItem
	| FunctionItem
	| UseDeclaration
	| ImplItem
	| IfExpression
	| MacroInvocation
	| SourceFile;

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Result of parsing rendered Rust source with the bundled tree-sitter-rust parser.
 *
 * - `ok: true`  → no `ERROR` nodes found; source is syntactically valid.
 * - `ok: false` → one or more `ERROR` nodes found; `errors` lists each with its
 *                 byte offset and the node kind string.
 */
export type ValidationResult =
	| { ok: true }
	| { ok: false; errors: Array<{ offset: number; kind: 'ERROR' }> };

// ---------------------------------------------------------------------------
// Factory functions  (exported from `src/index.ts`)
// ---------------------------------------------------------------------------

/**
 * Construct a `StructItem` IR node.
 *
 * @throws {Error} if `name` is empty or whitespace-only.
 *
 * @example
 * const node = structItem({
 *   name: "Config",
 *   body: "host: String,\n    port: u16,",
 *   children: "pub",
 * });
 */
export declare function structItem(
	config: import('../../src/types.js').StructItemConfig,
): StructItem;

/**
 * Construct a `FunctionItem` IR node.
 *
 * @throws {Error} if `name` or `body` is empty or whitespace-only.
 *
 * @example
 * const node = functionItem({
 *   name: "process",
 *   parameters: "input: &str",
 *   returnType: "String",
 *   body: "input.to_string()",
 *   children: "pub",
 * });
 */
export declare function functionItem(
	config: import('../../src/types.js').FunctionItemConfig,
): FunctionItem;

/**
 * Construct a `UseDeclaration` IR node.
 *
 * @throws {Error} if `argument` is empty or whitespace-only.
 *
 * @example
 * const node = useDeclaration({ argument: "std::collections::HashMap" });
 */
export declare function useDeclaration(
	config: import('../../src/types.js').UseDeclarationConfig,
): UseDeclaration;

/**
 * Construct an `ImplItem` IR node.
 *
 * @throws {Error} if `type` is empty or whitespace-only.
 *
 * @example
 * const node = implItem({
 *   type: "Guard",
 *   trait: "Drop",
 *   body: render(functionItem({ name: "drop", body: "// cleanup" })),
 * });
 */
export declare function implItem(
	config: import('../../src/types.js').ImplItemConfig,
): ImplItem;

/**
 * Construct an `IfExpression` IR node.
 *
 * @throws {Error} if `condition` or `consequence` is empty or whitespace-only.
 *
 * @example
 * const node = ifExpression({
 *   condition: "x > 0",
 *   consequence: "Ok(x)",
 *   alternative: 'Err("negative")',
 * });
 */
export declare function ifExpression(
	config: import('../../src/types.js').IfExpressionConfig,
): IfExpression;

/**
 * Construct a `MacroInvocation` IR node.
 *
 * @throws {Error} if `macro` or `children` is empty or whitespace-only.
 *
 * @example
 * const node = macroInvocation({ macro: "format", children: '"hello {}", name' });
 */
export declare function macroInvocation(
	config: import('../../src/types.js').MacroInvocationConfig,
): MacroInvocation;

/**
 * Construct a `SourceFile` IR node composing multiple top-level items.
 *
 * @throws {Error} if `children` is empty or missing.
 *
 * @example
 * const file = sourceFile({ children: [render(useDecl), render(structNode)] });
 */
export declare function sourceFile(
	config: import('../../src/types.js').SourceFileConfig,
): SourceFile;

// ---------------------------------------------------------------------------
// Core operations  (exported from `src/index.ts`)
// ---------------------------------------------------------------------------

/**
 * Render any IR node to a Rust source string.
 *
 * Pure function — no side effects. Performs exhaustive pattern matching on
 * `node.kind`. Renders nested nodes recursively (e.g., `ImplItem.body`,
 * `SourceFile.children`).
 *
 * @throws {Error} if an unrecognised node kind is encountered at runtime.
 * @throws {Error} if a child value is not a string or RustIrNode.
 *
 * @example
 * const src = render(structItem({ name: "Empty" }));
 * // → "struct Empty;"
 */
export declare function render(node: RustIrNode): string;

/**
 * Validate Rust source code using the bundled tree-sitter-rust parser.
 *
 * Returns `{ ok: true }` if the parse tree contains no `ERROR` nodes.
 * Returns `{ ok: false, errors }` listing each ERROR node's byte offset and kind.
 * If the parser itself throws, returns `{ ok: false }` with a synthetic error.
 *
 * @example
 * const result = validate("pub struct Empty;");
 * // → { ok: true }
 *
 * const bad = validate("pub struct {");
 * // → { ok: false, errors: [{ offset: 11, kind: "ERROR" }] }
 */
export declare function validate(source: string): ValidationResult;
