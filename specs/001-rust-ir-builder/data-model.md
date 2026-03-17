# Data Model — Rust IR Builder

## Overview

All IR nodes are **plain TypeScript objects** (discriminated union). Each node has a `kind` literal field whose value matches the corresponding tree-sitter-rust grammar node type name. There are no classes, no methods, no prototype chains.

The public API exposes:

- A **factory function** per node kind to construct validated IR nodes.
- A standalone **`render(node)`** function that pattern-matches on `kind` and emits Rust source.
- A standalone **`validate(source)`** function that calls `parse("rust", source)` from the JSSG runtime's `codemod:ast-grep` virtual module.

---

## Shared Types

### `Visibility`

```ts
type Visibility = 'pub' | undefined;
```

Maps to tree-sitter `visibility_modifier`. `undefined` = no modifier (private/local).

---

### `RustIrNode` (top-level union)

```ts
type RustIrNode =
	| StructItem
	| FunctionItem
	| UseDeclaration
	| ImplItem
	| IfExpression
	| MacroInvocation
	| SourceFile;
```

### `ValidationResult`

```ts
type ValidationResult =
	| { ok: true }
	| { ok: false; errors: Array<{ offset: number; kind: string }> };
```

`offset` is the byte offset of the `ERROR` node in the source string. `kind` is the tree-sitter node kind string (typically `"ERROR"`).

---

## IR Node Kinds

### 1. `StructItem`

**tree-sitter node**: `struct_item`

```ts
interface StructItem {
	kind: 'struct_item';
	name: string; // required — identifier
	fields: FieldDeclaration[]; // optional (default []) — struct body
	derives: string[]; // optional (default []) — derive attribute items
	visibility: Visibility; // optional (default undefined)
}

interface FieldDeclaration {
	name: string; // field identifier
	type: string; // raw Rust type string (e.g., "String", "Vec<u32>", "&'a str")
}
```

**Render rules**:

- If `derives` is non-empty → prepend `#[derive(A, B, ...)]`
- If `fields` is empty → render as unit struct: `pub struct Name;`
- Otherwise → render as named-field struct: `pub struct Name { field: Type, ... }`
- `visibility` prepended if `"pub"`

**State transitions**: None (value object).

**Validation rules** (enforced by factory at runtime):

- `name` must be a non-empty string
- Each `fields[i].name` and `fields[i].type` must be non-empty strings

---

### 2. `FunctionItem`

**tree-sitter node**: `function_item`

```ts
interface FunctionItem {
	kind: 'function_item';
	name: string; // required — identifier
	params: ParameterDeclaration[]; // optional (default [])
	returnType: string | undefined; // optional — raw Rust type string
	body: string; // required — raw Rust expression/statement(s) for block body
	visibility: Visibility;
}

interface ParameterDeclaration {
	name: string; // parameter identifier (e.g., "input", "self")
	type: string; // raw Rust type string (e.g., "&str", "&mut Self")
}
```

**Render rules**:

- `pub fn name(params) -> ReturnType { body }`
- Omit `-> ReturnType` if `returnType` is undefined
- `params` rendered as comma-separated `name: Type` pairs

**Validation rules**:

- `name` must be non-empty
- Each `params[i].name` and `params[i].type` must be non-empty
- `body` must be non-empty

---

### 3. `UseDeclaration`

**tree-sitter node**: `use_declaration`

```ts
interface UseDeclaration {
	kind: 'use_declaration';
	path: string[]; // required — path segments (e.g., ["std", "collections"])
	items: string[]; // required — imported items (e.g., ["HashMap", "BTreeMap"])
}
```

**Render rules**:

- Single item: `use path::Item;`
- Multiple items: `use path::{ItemA, ItemB};`
- `path` joined with `::`

**Validation rules**:

- `path` must be non-empty array of non-empty strings
- `items` must be non-empty array of non-empty strings

---

### 4. `ImplItem`

**tree-sitter node**: `impl_item`

```ts
interface ImplItem {
	kind: 'impl_item';
	type: string; // required — the type being implemented (e.g., "Guard")
	trait: string | undefined; // optional — trait being implemented (e.g., "Drop")
	methods: FunctionItem[]; // optional (default []) — method definitions
}
```

**Render rules**:

- No trait: `impl Type { ... methods ... }`
- With trait: `impl Trait for Type { ... methods ... }`

**Validation rules**:

- `type` must be non-empty
- Each element of `methods` must be a valid `FunctionItem`

---

### 5. `IfExpression`

**tree-sitter node**: `if_expression`

```ts
interface IfExpression {
	kind: 'if_expression';
	condition: string; // required — raw Rust expression
	consequence: string; // required — raw Rust expression/block body
	elseIfClauses: ElseIfClause[]; // optional (default [])
	elseClause: string | undefined; // optional — raw Rust expression/block body
}

interface ElseIfClause {
	condition: string; // raw Rust expression
	consequence: string; // raw Rust expression/block body
}
```

**Render rules**:

- `if condition { consequence }`
- - ` else if condN { consN }` for each else-if clause
- - ` else { elseClause }` if present

**Validation rules**:

- `condition` and `consequence` must be non-empty
- Each `elseIfClauses[i].condition` and `.consequence` must be non-empty

---

### 6. `MacroInvocation`

**tree-sitter node**: `macro_invocation`

```ts
interface MacroInvocation {
	kind: 'macro_invocation';
	macro: string; // required — macro name without `!` (e.g., "format", "vec", "println")
	tokens: string; // required — raw token tree content (e.g., `"hello {}", name`)
}
```

**Render rules**:

- `macro!(tokens)`

**Validation rules**:

- `macro` must be non-empty
- `tokens` must be non-empty

---

### 7. `SourceFile`

**tree-sitter node**: `source_file`

```ts
interface SourceFile {
	kind: 'source_file';
	items: RustIrNode[]; // required — top-level IR nodes in order
}
```

**Render rules**:

- Each item rendered via `render(item)`, joined by `\n\n`

**Validation rules**:

- `items` must be a non-empty array

---

## Entity Relationships

```
SourceFile
  └── items: RustIrNode[]
        ├── StructItem
        │     └── fields: FieldDeclaration[]
        ├── FunctionItem
        │     └── params: ParameterDeclaration[]
        ├── UseDeclaration
        ├── ImplItem
        │     └── methods: FunctionItem[]
        ├── IfExpression
        │     └── elseIfClauses: ElseIfClause[]
        └── MacroInvocation
```

`ImplItem.methods` references `FunctionItem` directly (not by ID) — it is an inline composition, not a forward reference. There is no shared mutable state between nodes.

---

## Design Notes

- **No shared identity** — IR nodes are value objects; two nodes with the same fields are equivalent. There are no IDs, no references by key.
- **Raw strings for sub-expressions** — fields like `body`, `condition`, `consequence`, `tokens`, and `type` accept raw Rust source strings. This is intentional: the IR builder is not a full Rust expression tree; it targets the Render-Then-Validate guarantee by delegating inner expression rendering to the caller and catching errors at `validate()` time.
- **Grammar fidelity over ergonomics** — field names (e.g., `elseIfClauses`, `consequence`) mirror tree-sitter-rust grammar child names, not TypeScript conventions. This is mandated by Constitution Principle I.
