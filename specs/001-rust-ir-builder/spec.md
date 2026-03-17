# Feature Specification: Rust IR Builder

**Feature Branch**: `feature/001-rust-ir-builder`
**Created**: 2025-07-19
**Status**: Draft
**Input**: User description: "Create a typed Rust IR builder for JSSG transforms — builds structured Rust AST nodes, renders to source, validates via tree-sitter parse"

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Build and render a struct (Priority: P1)

A JSSG transform author translates a Python `@dataclass` class into Rust. Instead of concatenating strings, they construct a typed `StructItem` IR node with named fields and types, call `render()`, and get a syntactically valid `pub struct` declaration.

**Why this priority**: Struct emission is the most common output of `tier1-syntax.ts` and exercises the core build → render → validate loop.

**Independent Test**: Build a `StructItem` with two fields, render it, parse the output with `parse<Rust>("rust", rendered)`, assert zero `ERROR` nodes.

**Acceptance Scenarios**:

1. **Given** a `StructItem` with name `Guard`, a pre-rendered `body` containing field declarations, and `children: ["pub"]` for visibility, **When** `render()` is called, **Then** the output is parseable Rust containing a `struct_item` with the field body.
2. ~~**Given** a `StructItem` with a derive attribute `["Debug", "Clone", "PartialEq"]`, **When** `render()` is called, **Then** the output starts with `#[derive(Debug, Clone, PartialEq)]` followed by `pub struct`.~~ _Removed in grammar-direct refactor — `derives` is not a tree-sitter-rust grammar field on `struct_item`. Derive attributes must be rendered as a separate string prepended to the struct output if needed (Constitution Principle I: Grammar Fidelity)._
3. **Given** a `StructItem` with zero fields (no `body`), **When** `render()` is called, **Then** the output is `pub struct Empty;` (unit struct).

---

### User Story 2 — Build and render a function (Priority: P1)

A transform author translates a Python `def` into Rust. They construct a `FunctionItem` IR node with parameters, return type, and body statements, then render it.

**Why this priority**: Function emission is the other primary output of `tier1-syntax.ts`. Functions and structs together cover the majority of transform output.

**Independent Test**: Build a `FunctionItem` with two params and a body, render it, validate via tree-sitter parse.

**Acceptance Scenarios**:

1. **Given** a `FunctionItem` named `process` with params `[{ name: "input", type: "&str" }]`, return type `String`, and body `"input.to_string()"`, **When** `render()` is called, **Then** output parses as a `function_item` with a `parameters` child containing one `parameter`.
2. **Given** a `FunctionItem` with no return type, **When** `render()` is called, **Then** the output omits the `-> Type` clause.
3. **Given** a `FunctionItem` with visibility `pub`, **When** `render()` is called, **Then** the output starts with `pub fn`.

---

### User Story 3 — Build and render a use declaration (Priority: P2)

A transform author translates a Python `import` into a Rust `use` statement by constructing a `UseDeclaration` IR node.

**Why this priority**: Use declarations are required by `tier2-modules.ts` but are syntactically simpler than structs/functions.

**Independent Test**: Build a `UseDeclaration`, render, validate.

**Acceptance Scenarios**:

1. **Given** a `UseDeclaration` with `argument: "std::collections::{HashMap, BTreeMap}"` (grammar field: `use_declaration.argument`), **When** `render()` is called, **Then** output is `use std::collections::{HashMap, BTreeMap};` and parses as a `use_declaration`.
2. **Given** a `UseDeclaration` with `argument: "std::fmt::Display"`, **When** `render()` is called, **Then** output is `use std::fmt::Display;`.

> _Grammar alignment note_: The original spec described separate `path` and `items` arrays. The tree-sitter-rust grammar defines `use_declaration` with a single `argument` field containing the full use tree. The implementation follows the grammar (Constitution Principle I).

---

### User Story 4 — Build and render an impl block (Priority: P2)

A transform author constructs an `ImplItem` for a struct, optionally implementing a trait (e.g., `Drop`), containing method definitions.

**Why this priority**: Required by `tier2-control.ts` for context manager → Drop translation.

**Independent Test**: Build an `ImplItem` with a `Drop` trait and a `drop` method, render, validate.

**Acceptance Scenarios**:

1. **Given** an `ImplItem` for type `Guard` with no trait, and a pre-rendered `body` string containing a function via `render(functionItem(...))`, **When** `render()` is called, **Then** output parses as an `impl_item` with a `declaration_list` containing a `function_item`.
2. **Given** an `ImplItem` for type `Guard` implementing trait `Drop`, **When** `render()` is called, **Then** output contains `impl Drop for Guard`.

> _Grammar alignment note_: The grammar field `impl_item.body` is a `declaration_list`, not an array of `FunctionItem` nodes. Methods are composed by rendering individual `functionItem` nodes and passing the result as the `body` string.

---

### User Story 5 — Build and render an if expression (Priority: P2)

A transform author constructs an `IfExpression` with condition, consequence, optional `else if` chains, and optional `else`.

**Why this priority**: if/elif/else translation is a core pattern in `tier1-syntax.ts` but is already somewhat handled by string concatenation — this upgrades it to typed IR.

**Independent Test**: Build an `IfExpression` with an else-if and else clause, render, validate.

**Acceptance Scenarios**:

1. **Given** an `IfExpression` with `condition: "x > 0"`, `consequence: "Ok(x)"`, `alternative: "Err(\"negative\")"` (grammar field: `if_expression.alternative`), **When** `render()` is called, **Then** output parses as an `if_expression` with an `else_clause`.
2. **Given** nested `IfExpression` nodes composed via `render()` — an outer if with `alternative` set to the rendered output of an inner `ifExpression` — **When** `render()` is called, **Then** output contains chained `else if` clauses that parse without `ERROR` nodes.

> _Grammar alignment note_: The original spec described a flat `elseIfClauses` array. In the tree-sitter-rust grammar, else-if chains are nested `if_expression` nodes inside the `alternative` field (which points to `else_clause`). The implementation follows the grammar via compositional rendering (Constitution Principle I).

---

### User Story 6 — Build and render a macro invocation (Priority: P3)

A transform author constructs a `MacroInvocation` for things like `format!("...", args)`.

**Why this priority**: Used in f-string translation but low volume.

**Independent Test**: Build a `MacroInvocation` for `format!`, render, validate.

**Acceptance Scenarios**:

1. **Given** a `MacroInvocation` with `macro: "format"` and `children: '"hello {}", name'` (grammar field: `macro_invocation` children slot `token_tree`), **When** `render()` is called, **Then** output is `format!("hello {}", name)` and parses as a `macro_invocation`.

---

### User Story 7 — Validate rendered output detects errors (Priority: P1)

A transform author renders an intentionally malformed IR node. The `validate()` function detects `ERROR` nodes in the tree-sitter parse and returns a diagnostic.

**Why this priority**: Validation is the safety net — without it the IR is just string concatenation with extra steps.

**Independent Test**: Render a struct with an invalid field type (e.g., containing a newline), validate, assert error returned.

**Acceptance Scenarios**:

1. **Given** a rendered string containing a syntax error, **When** `validate(rendered)` is called, **Then** it returns an error result containing the offset and kind of the `ERROR` node.
2. **Given** a valid rendered string, **When** `validate(rendered)` is called, **Then** it returns success.

---

### User Story 8 — Compose a source file from multiple IR nodes (Priority: P3)

A transform author builds a full Rust source file by composing multiple top-level IR nodes (`use`, `struct`, `impl`, functions) into a `SourceFile` container, then renders the whole file.

**Why this priority**: File-level composition is needed for the final pipeline output but can be deferred — individual node rendering delivers value immediately.

**Independent Test**: Build a `SourceFile` with a use declaration, a struct, and an impl block. Render. Validate the entire output.

**Acceptance Scenarios**:

1. **Given** a `SourceFile` with `children` containing three pre-rendered strings (from `render(useDeclaration(...))`, `render(structItem(...))`, `render(implItem(...))`), **When** `render()` is called, **Then** output parses as a `source_file` with three top-level items and zero `ERROR` nodes.

> _Grammar alignment note_: The grammar's `source_file.children` slot accepts `_declaration_statement` kinds (abstract supertypes) which resolve to branded-string leaves in the type system. Children are composed by pre-rendering each IR node.

---

### Edge Cases

- What happens when a struct field type contains generic parameters (e.g., `Vec<String>`)? IR must preserve the full type string without escaping.
- What happens when a function body is multi-line? The render must properly indent nested statements.
- What happens when an identifier is a Rust keyword? The IR should not silently accept it — `validate()` will catch it via tree-sitter.
- What happens when render is called on a node with missing required fields (e.g., struct with no name)? The builder rejects this at construction time via TypeScript types (compilation error) **and** also throws a descriptive error at runtime — see FR-007 and the clarification below.

## Clarifications

### Session 2026-03-16 — Grammar-Direct Refactor

- Q: Should IR node types be hand-rolled or derived from the grammar? → A: 100% grammar-derived — all node shapes are mapped types from `@codemod.com/jssg-types/langs/rust` with `CamelCase` field name conversion (via `type-fest`) and an ergonomic alias map (e.g. `parameter.pattern` → `name`). Zero hand-rolled field definitions.

- Q: How are `else if` chains represented? → A: Compositionally — the `alternative` field (grammar: `if_expression.alternative` → `else_clause`) accepts a pre-rendered string. To build `else if` chains, render an inner `ifExpression` and pass its output as `alternative` to the outer one. The renderer detects strings starting with `if ` and emits `else if` instead of `else { ... }`.

- Q: How are `impl` method bodies composed? → A: The grammar field `impl_item.body` is a `declaration_list`. Methods are composed by rendering individual `functionItem` nodes (with optional indentation) and passing the result as the `body` string.

- Q: How are `source_file` children composed? → A: The grammar's `source_file.children` slot accepts abstract `_declaration_statement` supertypes. Children are composed by pre-rendering each IR node via `render()` and passing the resulting strings as the `children` array.

- Q: What happened to `derives`, `visibility`, `fields` (as array), `params` (as array), `methods`, `elseIfClauses`, `tokens`, `items`? → A: All removed in favor of grammar-direct fields: `body` (pre-rendered), `children` (visibility/token_tree), `parameters` (pre-rendered string), `alternative`, per Constitution Principle I (Grammar Fidelity).

### Session 2026-03-13

- Q: How should IR nodes be implemented (classes vs discriminated unions vs factory+closure)? → A: Discriminated union + factory functions — plain objects with a `kind` discriminant, standalone `render(node)` function.

- Q: Should `validate()` depend on the JSSG runtime, or bundle its own tree-sitter-rust parser? → A: JSSG runtime — `validate()` calls `parse` from the `codemod:ast-grep` virtual module provided by the JSSG runtime. No WASM bundling. Unit tests mock `codemod:ast-grep` via Vitest alias; JSSG compatibility is the single source of truth for real parse behaviour.

- Q: How should the builder handle invalid or missing fields at runtime? → A: Throw error — builder functions throw a descriptive error if required fields are missing or invalid, in addition to compile-time checks.

- Q: Who is responsible for writing (emitting) the IR? → A: The IR builder library only provides node builders; the JSSG transform or adapter is responsible for constructing IR nodes from input.

- Q: How is IR converted to code? → A: The IR builder library provides a pure `render(node)` function that converts any IR node (or tree of nodes) to Rust source code. The transform or adapter calls `render()` on the constructed IR.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Library MUST export typed builder functions for each supported Rust node kind: `StructItem`, `FunctionItem`, `UseDeclaration`, `ImplItem`, `IfExpression`, `MacroInvocation`, `SourceFile`.
- **FR-002**: Each builder MUST accept a configuration object whose fields mirror the tree-sitter-rust grammar for that node kind (per constitution principle I: Grammar Fidelity).
- **FR-003**: A standalone `render(node: RustIrNode): string` function MUST accept any IR node variant and produce syntactically valid Rust source text.
- **FR-004**: Library MUST export `validate(source: string): ValidationResult` that calls `parse("rust", source)` from the `codemod:ast-grep` JSSG runtime virtual module and reports any `ERROR` nodes found in the tree.
- **FR-005**: Library MUST be importable in JSSG transforms via standard ESM `import` (per constitution principle V: JSSG Runtime Compatibility).
- **FR-006**: Library MUST have zero npm runtime dependencies. `@codemod.com/jssg-types` is a devDependency only (TypeScript type declarations). `validate()` relies on `codemod:ast-grep`, a virtual module provided by the JSSG runtime — not an npm package.
- **FR-007**: All IR node configurations MUST be expressible via TypeScript interfaces with required and optional fields — missing required fields MUST be caught at compile time, and builder functions MUST throw a descriptive error at runtime if required fields are missing or invalid.
- **FR-008**: `render()` output MUST pass `validate()` for all supported node kinds when constructed with valid inputs.

### Key Entities

- **IR Node**: A plain TypeScript object (discriminated union) representing a single Rust grammar node. Has a `kind` literal field matching a tree-sitter-rust node type name and configuration fields. Rendered via a standalone `render(node): string` function (not an instance method). Factory functions (e.g., `structItem(...)`, `functionItem(...)`) construct each variant.
- **SourceFile**: A container IR node variant whose `children` field holds an ordered list of pre-rendered Rust source strings (each produced by calling `render()` on an individual IR node). The `render()` function joins these with `\n\n` separation.
- **ValidationResult**: Either `{ ok: true }` or `{ ok: false, errors: Array<{ offset: number, kind: string }> }` describing parse errors.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: All 7 supported node kinds (struct, function, use, impl, if, macro, source_file) have at least one positive render+validate round-trip test passing.
- **SC-002**: `validate()` correctly detects intentionally malformed Rust in 100% of negative test cases.
- **SC-003**: TypeScript strict mode compiles with zero errors.
- **SC-004**: An existing transform (`tier1-syntax.ts`) can be refactored to use the IR builder for struct emission, producing identical Rust output as the current string-concatenation approach.
- **SC-005**: Library runs successfully inside the JSSG runtime (verified by an integration test that imports the library in a JSSG transform, processes a fixture, and confirms `validate()` correctly uses the runtime's `codemod:ast-grep` parser).
