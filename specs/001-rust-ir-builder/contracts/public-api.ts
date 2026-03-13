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
 */

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

/** Rust visibility modifier. `undefined` = no modifier (crate-private). */
export type Visibility = "pub" | undefined;

// ---------------------------------------------------------------------------
// IR Node Kinds
// ---------------------------------------------------------------------------

/**
 * A single named field in a Rust struct.
 * Maps to tree-sitter-rust `field_declaration`.
 */
export interface FieldDeclaration {
  /** Field identifier (e.g., `"host"`) */
  name: string;
  /** Raw Rust type string (e.g., `"String"`, `"Vec<u32>"`, `"&'a str"`) */
  type: string;
}

/**
 * A single function parameter.
 * Maps to tree-sitter-rust `parameter`.
 */
export interface ParameterDeclaration {
  /** Parameter identifier (e.g., `"input"`, `"self"`) */
  name: string;
  /** Raw Rust type string (e.g., `"&str"`, `"&mut Self"`) */
  type: string;
}

/**
 * An `else if` branch in an if-expression.
 * Corresponds to `else_clause` wrapping an `if_expression` in tree-sitter-rust.
 */
export interface ElseIfClause {
  /** Raw Rust boolean expression (e.g., `"x < 0"`) */
  condition: string;
  /** Raw Rust expression(s) for the block body (e.g., `"Err(\"negative\")"`) */
  consequence: string;
}

// ---------------------------------------------------------------------------
// IR Node types  (discriminated union — `kind` is the discriminant)
// ---------------------------------------------------------------------------

/**
 * Rust `struct` declaration.
 * tree-sitter-rust node: `struct_item`
 */
export interface StructItem {
  readonly kind: "struct_item";
  /** Struct identifier (e.g., `"Config"`) */
  name: string;
  /** Named fields — empty array → unit struct `Name;` */
  fields: FieldDeclaration[];
  /** Items in `#[derive(...)]` — empty array → no derive attribute */
  derives: string[];
  visibility: Visibility;
}

/**
 * Rust free function or method.
 * tree-sitter-rust node: `function_item`
 */
export interface FunctionItem {
  readonly kind: "function_item";
  /** Function identifier (e.g., `"process"`) */
  name: string;
  /** Parameter list — empty array → `()` */
  params: ParameterDeclaration[];
  /** Return type string — `undefined` → omit `-> Type` clause */
  returnType: string | undefined;
  /** Raw Rust expression(s) for the block body */
  body: string;
  visibility: Visibility;
}

/**
 * Rust `use` declaration.
 * tree-sitter-rust node: `use_declaration`
 */
export interface UseDeclaration {
  readonly kind: "use_declaration";
  /** Path segments, e.g. `["std", "collections"]` */
  path: string[];
  /** Imported items, e.g. `["HashMap", "BTreeMap"]` */
  items: string[];
}

/**
 * Rust `impl` block.
 * tree-sitter-rust node: `impl_item`
 */
export interface ImplItem {
  readonly kind: "impl_item";
  /** Type being implemented (e.g., `"Guard"`) */
  type: string;
  /** Trait being implemented (e.g., `"Drop"`) — `undefined` → inherent impl */
  trait: string | undefined;
  /** Method definitions */
  methods: FunctionItem[];
}

/**
 * Rust `if` / `else if` / `else` expression.
 * tree-sitter-rust node: `if_expression`
 */
export interface IfExpression {
  readonly kind: "if_expression";
  /** Raw Rust boolean expression (e.g., `"x > 0"`) */
  condition: string;
  /** Raw Rust expression(s) for the block body */
  consequence: string;
  /** Chained `else if` branches */
  elseIfClauses: ElseIfClause[];
  /** Raw Rust expression(s) for the `else` block — `undefined` → no else */
  elseClause: string | undefined;
}

/**
 * Rust macro invocation.
 * tree-sitter-rust node: `macro_invocation`
 */
export interface MacroInvocation {
  readonly kind: "macro_invocation";
  /** Macro name without `!` (e.g., `"format"`, `"vec"`, `"println"`) */
  macro: string;
  /** Raw token tree content (e.g., `'"hello {}", name'`) */
  tokens: string;
}

/**
 * A complete Rust source file containing top-level items.
 * tree-sitter-rust node: `source_file`
 */
export interface SourceFile {
  readonly kind: "source_file";
  /** Top-level IR nodes in declaration order */
  items: RustIrNode[];
}

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
  | { ok: false; errors: Array<{ offset: number; kind: string }> };

// ---------------------------------------------------------------------------
// Factory functions  (exported from `src/index.ts`)
// ---------------------------------------------------------------------------

/**
 * Construct a `StructItem` IR node.
 *
 * @throws {Error} if `name` is empty, or any field `name`/`type` is empty.
 *
 * @example
 * const node = structItem({
 *   name: "Config",
 *   fields: [{ name: "host", type: "String" }, { name: "port", type: "u16" }],
 *   derives: ["Debug", "Clone"],
 * });
 */
export declare function structItem(config: {
  name: string;
  fields?: FieldDeclaration[];
  derives?: string[];
  visibility?: Visibility;
}): StructItem;

/**
 * Construct a `FunctionItem` IR node.
 *
 * @throws {Error} if `name` or `body` is empty, or any param field is empty.
 *
 * @example
 * const node = functionItem({
 *   name: "process",
 *   params: [{ name: "input", type: "&str" }],
 *   returnType: "String",
 *   body: "input.to_string()",
 *   visibility: "pub",
 * });
 */
export declare function functionItem(config: {
  name: string;
  params?: ParameterDeclaration[];
  returnType?: string;
  body: string;
  visibility?: Visibility;
}): FunctionItem;

/**
 * Construct a `UseDeclaration` IR node.
 *
 * @throws {Error} if `argument` is empty.
 *
 * @example
 * const node = useDeclaration({ argument: "std::collections::HashMap" });
 */
export declare function useDeclaration(config: {
  argument: string;
}): UseDeclaration;

/**
 * Construct an `ImplItem` IR node.
 *
 * @throws {Error} if `type` is empty.
 *
 * @example
 * const node = implItem({
 *   type: "Guard",
 *   trait: "Drop",
 *   methods: [functionItem({ name: "drop", params: [{ name: "self", type: "&mut Self" }], body: "// cleanup" })],
 * });
 */
export declare function implItem(config: {
  type: string;
  trait?: string;
  methods?: FunctionItem[];
}): ImplItem;

/**
 * Construct an `IfExpression` IR node.
 *
 * @throws {Error} if `condition` or `consequence` is empty.
 *
 * @example
 * const node = ifExpression({
 *   condition: "x > 0",
 *   consequence: "Ok(x)",
 *   elseClause: 'Err("negative")',
 * });
 */
export declare function ifExpression(config: {
  condition: string;
  consequence: string;
  elseIfClauses?: ElseIfClause[];
  elseClause?: string;
}): IfExpression;

/**
 * Construct a `MacroInvocation` IR node.
 *
 * @throws {Error} if `macro` or `tokens` is empty.
 *
 * @example
 * const node = macroInvocation({ macro: "format", tokens: '"hello {}", name' });
 */
export declare function macroInvocation(config: {
  macro: string;
  tokens: string;
}): MacroInvocation;

/**
 * Construct a `SourceFile` IR node composing multiple top-level nodes.
 *
 * @throws {Error} if `items` is empty.
 *
 * @example
 * const file = sourceFile({ items: [useDecl, structNode, implNode] });
 */
export declare function sourceFile(config: {
  items: RustIrNode[];
}): SourceFile;

// ---------------------------------------------------------------------------
// Core operations  (exported from `src/index.ts`)
// ---------------------------------------------------------------------------

/**
 * Render any IR node to a Rust source string.
 *
 * Pure function — no side effects. Performs exhaustive pattern matching on
 * `node.kind`. Renders nested nodes recursively (e.g., `ImplItem.methods`,
 * `SourceFile.items`).
 *
 * @example
 * const src = render(structItem({ name: "Empty" }));
 * // → "pub struct Empty;"
 */
export declare function render(node: RustIrNode): string;

/**
 * Validate Rust source code using the bundled tree-sitter-rust parser.
 *
 * Returns `{ ok: true }` if the parse tree contains no `ERROR` nodes.
 * Returns `{ ok: false, errors }` listing each ERROR node's byte offset and kind.
 *
 * The bundled parser is ESM-compatible and has no Node.js built-in dependencies.
 * JSSG compatibility is verified by the integration test.
 *
 * @example
 * const result = validate("pub struct Empty;");
 * // → { ok: true }
 *
 * const bad = validate("pub struct {");
 * // → { ok: false, errors: [{ offset: 11, kind: "ERROR" }] }
 */
export declare function validate(source: string): ValidationResult;
