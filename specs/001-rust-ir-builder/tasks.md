# Tasks: Rust IR Builder

**Input**: Design documents from `/specs/001-rust-ir-builder/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US7)
- Exact file paths included in descriptions

---

## Phase 0: Project Scaffolding

**Purpose**: Initialize the TypeScript project so `vitest` runs with zero tests and `tsc` compiles cleanly.

- [ ] T001 Create `package.json` with `"type": "module"`, name `@refactory/rust-ir`, devDependencies: `@codemod.com/jssg-types`, `typescript`, `vitest`
- [ ] T002 Create `tsconfig.json` — strict, ESM, `noEmit`, `"types": ["@codemod.com/jssg-types"]`, include `src/**/*.ts`
- [ ] T003 Create `vitest.config.ts` — default config
- [ ] T004 Create empty `src/index.ts`
- [ ] T005 Verify: `npm install` succeeds, `npx vitest run` exits 0, `npx tsc --noEmit` exits 0

**Checkpoint**: Project skeleton compiles and test runner works

---

## Phase 1: Core Infrastructure (US7 — Validation)

**Purpose**: `validate()` and `indent()` — shared utilities that all node renderers depend on.

**Goal (US7)**: Validate rendered output detects errors. The safety net for the entire IR.

**Independent Test**: Pass malformed Rust to `validate()`, confirm errors. Pass valid Rust, confirm ok.

### Tests (write FIRST — must FAIL before implementation)

- [ ] T006 [US7] Write `tests/validate.test.ts`:
  - Test: valid Rust (`fn main() {}`) → `{ ok: true }`
  - Test: invalid Rust (`fn {}`) → `{ ok: false, errors: [...] }` with offset and kind
  - Test: empty string → `{ ok: true }` (valid empty source_file)
  - Test: struct with syntax error → error detected

### Implementation

- [ ] T007 [US7] Create `src/validate.ts` — `validate(source: string): ValidationResult`
  - Import `parse` from `codemod:ast-grep`
  - Parse with `parse<Rust>("rust", source)`
  - Walk tree depth-first collecting `ERROR` nodes (offset + parent kind)
  - Export `ValidationResult` type
- [ ] T008 [P] Create `src/indent.ts` — `indent(text: string, level: number): string`
  - Add `level * 4` spaces to each non-empty line
  - Export function
- [ ] T009 Run `tests/validate.test.ts` — all tests pass
- [ ] T010 Export from `src/index.ts`: `validate`, `ValidationResult`, `indent`

**Checkpoint**: `validate()` works, `indent()` works, all Phase 1 tests green

---

## Phase 2: P1 Node Kinds — Struct + Function (US1, US2)

**Purpose**: The two most-used node kinds, covering the main output of `tier1-syntax.ts`.

### User Story 1 — StructItem

**Goal**: Build and render a Rust struct from a typed config object.

**Independent Test**: Build a struct with fields, render, validate → zero ERROR nodes.

#### Tests (write FIRST)

- [ ] T011 [US1] Write `tests/nodes/struct-item.test.ts`:
  - Test: struct with two fields → parseable `struct_item` with `field_declaration` children
  - Test: struct with `derives: ["Debug", "Clone", "PartialEq"]` → output starts with `#[derive(...)]`
  - Test: struct with zero fields → `pub struct Empty;` (unit struct)
  - Test: field with generic type `Vec<String>` → preserved without escaping
  - Negative: rendered output passes `validate()` for all positive cases

#### Implementation

- [ ] T012 [US1] Create `src/nodes/struct-item.ts`:
  - Export `FieldDeclaration` interface: `{ name: string; type: string; visibility?: string }`
  - Export `StructItemConfig` interface: `{ name: string; fields: FieldDeclaration[]; derives?: string[]; visibility?: string }`
  - Export `renderStructItem(config: StructItemConfig): string`
  - Handle: derive attribute, visibility (default "pub"), field list, unit struct (empty fields)
- [ ] T013 [US1] Run `tests/nodes/struct-item.test.ts` — all tests pass
- [ ] T014 [US1] Add re-exports to `src/index.ts`

### User Story 2 — FunctionItem

**Goal**: Build and render a Rust function from a typed config object.

**Independent Test**: Build a function with params and body, render, validate.

#### Tests (write FIRST)

- [ ] T015 [P] [US2] Write `tests/nodes/function-item.test.ts`:
  - Test: function with one param and return type → parseable `function_item` with `parameters`
  - Test: function with no return type → no `-> Type` in output
  - Test: function with `visibility: "pub"` → starts with `pub fn`
  - Test: multi-line body → properly indented
  - Negative: all positive cases pass `validate()`

#### Implementation

- [ ] T016 [US2] Create `src/nodes/function-item.ts`:
  - Export `Parameter` interface: `{ name: string; type: string }`
  - Export `FunctionItemConfig` interface: `{ name: string; params: Parameter[]; returnType?: string; body: string; visibility?: string }`
  - Export `renderFunctionItem(config: FunctionItemConfig): string`
  - Handle: visibility (default "pub"), param list, optional return type, body indentation via `indent()`
- [ ] T017 [US2] Run `tests/nodes/function-item.test.ts` — all tests pass
- [ ] T018 [US2] Add re-exports to `src/index.ts`

**Checkpoint**: StructItem + FunctionItem render and validate. Covers tier1-syntax.ts struct + function output.

---

## Phase 3: P2 Node Kinds — Use + Impl + If (US3, US4, US5)

**Purpose**: Secondary node kinds needed by tier2-modules.ts and tier2-control.ts.

### User Story 3 — UseDeclaration

**Goal**: Build and render a Rust `use` statement.

#### Tests (write FIRST)

- [ ] T019 [P] [US3] Write `tests/nodes/use-declaration.test.ts`:
  - Test: path `["std", "collections"]` + items `["HashMap", "BTreeMap"]` → `use std::collections::{HashMap, BTreeMap};`
  - Test: single item → `use std::collections::HashMap;` (no braces)
  - Negative: all pass `validate()`

#### Implementation

- [ ] T020 [US3] Create `src/nodes/use-declaration.ts`:
  - Export `UseDeclarationConfig`: `{ path: string[]; items: string[] }`
  - Export `renderUseDeclaration(config): string`
  - Handle: path joining with `::`, single vs. multi item (braces), trailing semicolon
- [ ] T021 [US3] Run tests — all pass
- [ ] T022 [US3] Add re-exports to `src/index.ts`

### User Story 4 — ImplItem

**Goal**: Build and render a Rust `impl` block with methods.

#### Tests (write FIRST)

- [ ] T023 [P] [US4] Write `tests/nodes/impl-item.test.ts`:
  - Test: inherent impl with one method → parseable `impl_item` with `declaration_list`
  - Test: trait impl (`Drop` for `Guard`) → output contains `impl Drop for Guard`
  - Test: impl with `&mut self` method → self parameter renders correctly
  - Negative: all pass `validate()`

#### Implementation

- [ ] T024 [US4] Create `src/nodes/impl-item.ts`:
  - Export `ImplItemConfig`: `{ type: string; trait?: string; methods: FunctionItemConfig[] }`
  - Export `renderImplItem(config): string`
  - Handle: inherent vs. trait impl, methods rendered via `renderFunctionItem()` with adjusted indentation
  - Depends on: `renderFunctionItem` from `function-item.ts`
- [ ] T025 [US4] Run tests — all pass
- [ ] T026 [US4] Add re-exports to `src/index.ts`

### User Story 5 — IfExpression

**Goal**: Build and render a Rust if/else-if/else expression.

#### Tests (write FIRST)

- [ ] T027 [P] [US5] Write `tests/nodes/if-expression.test.ts`:
  - Test: if + else → parseable `if_expression` with `else_clause`
  - Test: if + else-if + else → chained `else if` clauses, zero ERROR nodes
  - Test: if only (no else) → valid expression
  - Negative: all pass `validate()`

#### Implementation

- [ ] T028 [US5] Create `src/nodes/if-expression.ts`:
  - Export `IfBranch`: `{ condition: string; body: string }`
  - Export `IfExpressionConfig`: `{ ifBranch: IfBranch; elseIfBranches?: IfBranch[]; elseBranch?: string }`
  - Export `renderIfExpression(config): string`
  - Handle: condition, braces, else-if chains, optional else
- [ ] T029 [US5] Run tests — all pass
- [ ] T030 [US5] Add re-exports to `src/index.ts`

**Checkpoint**: All P1 + P2 node kinds render and validate. Covers tier1-syntax, tier2-modules, tier2-control output.

---

## Phase 4: P3 Node Kinds — Macro + SourceFile (US6, US8)

**Purpose**: Lower-priority nodes for macro invocations and file composition.

### User Story 6 — MacroInvocation

**Goal**: Build and render a Rust macro call (e.g., `format!(...)`).

#### Tests (write FIRST)

- [ ] T031 [P] [US6] Write `tests/nodes/macro-invocation.test.ts`:
  - Test: `format` macro with args → `format!("hello {}", name)`, parses as `macro_invocation`
  - Test: `vec` macro → `vec![1, 2, 3]`
  - Negative: all pass `validate()`

#### Implementation

- [ ] T032 [US6] Create `src/nodes/macro-invocation.ts`:
  - Export `MacroInvocationConfig`: `{ name: string; args: string; delimiter?: "(" | "[" }`
  - Export `renderMacroInvocation(config): string`
  - Handle: `name!( args )` or `name![ args ]` depending on delimiter (default `(`)
- [ ] T033 [US6] Run tests — all pass
- [ ] T034 [US6] Add re-exports to `src/index.ts`

### User Story 8 — SourceFile

**Goal**: Compose multiple top-level IR nodes into a complete Rust source file.

#### Tests (write FIRST)

- [ ] T035 [US8] Write `tests/nodes/source-file.test.ts`:
  - Test: file with `[UseDeclaration, StructItem, ImplItem]` → parseable `source_file` with 3 top-level children
  - Test: empty file → empty string, passes `validate()`
  - Negative: full output passes `validate()`

#### Implementation

- [ ] T036 [US8] Create `src/nodes/source-file.ts`:
  - Export `TopLevelNode` discriminated union
  - Export `SourceFileConfig`: `{ items: TopLevelNode[] }`
  - Export `renderSourceFile(config): string`
  - Dispatch each item to its render function, join with `\n\n`
  - Depends on: all other render functions
- [ ] T037 [US8] Run tests — all pass
- [ ] T038 [US8] Add re-exports to `src/index.ts`

**Checkpoint**: All 7 node kinds + validate implemented and tested. Full library complete.

---

## Phase 5: Integration Proof (SC-004, SC-005)

**Purpose**: Verify the library works in the real JSSG transform context.

- [ ] T039 [SC-004] In `python-to-rust` repo: refactor `translateClass()` in `transforms/tier1-syntax.ts` to use `renderStructItem()` from `@refactory/rust-ir` instead of string concatenation
- [ ] T040 [SC-005] Run `python-to-rust` e2e test (`tests/e2e/run.sh`) — verify identical Rust output
- [ ] T041 Final: `npx tsc --noEmit` → zero errors; `npx vitest run` → all tests pass; all success criteria met

**Checkpoint**: Library proven in production context. Feature complete.

---

## Dependency Graph

```
T001-T005 (scaffolding)
    │
    ▼
T006-T010 (validate + indent)
    │
    ├──────────────────┐
    ▼                  ▼
T011-T014 (struct)   T015-T018 (function)  ← can run in parallel
    │                  │
    │    ┌─────────────┤
    │    │             │
    ▼    ▼             ▼
T019-T022 (use) [P]  T023-T026 (impl)     T027-T030 (if) [P]
                       │                        │
    ┌──────────────────┴────────────────────────┘
    ▼
T031-T034 (macro) [P]   T035-T038 (source_file)
                              │
                              ▼
                         T039-T041 (integration)
```

**Parallelizable pairs**:
- T011-T014 (struct) ‖ T015-T018 (function)
- T019-T022 (use) ‖ T027-T030 (if)
- T031-T034 (macro) ‖ T035-T038 (source_file) — only if macro tests don't need source_file
