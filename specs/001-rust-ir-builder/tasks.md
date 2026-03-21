# Tasks: Rust IR Builder

**Input**: Design documents from `/specs/001-rust-ir-builder/`
**Prerequisites**: plan.md ✅ · spec.md ✅ · research.md ✅ · data-model.md ✅ · contracts/public-api.ts ✅ · quickstart.md ✅

**TDD mandatory** (Constitution Principle III): in every user story phase, tests are written first and must fail before implementation begins.

**Tests are included** because the constitution mandates TDD for every IR node kind (render round-trip + negative test required per kind).

## Format: `[ID] [P?] [Story?] Description with file path`

- **[P]**: Can run in parallel with other tasks in this phase (different files, no blocking dependency)
- **[US_n_]**: Which user story this task belongs to — required in all user story phases
- Sequential IDs across all phases

---

## Phase 1: Setup

**Purpose**: Project initialization — package.json, TypeScript config, Vitest, directory skeleton.

- [x] T001 Initialize `package.json` with name `rust-ir`, `"type": "module"`, TypeScript 5.x, Vitest, and `@codemod.com/jssg-types` as devDeps — **zero npm runtime dependencies** (no `web-tree-sitter`, no `tree-sitter-rust`) in `package.json`
- [x] T002 [P] Create `tsconfig.json` with `strict`, `module: ESNext`, `moduleResolution: bundler`, `noEmit: true` in `tsconfig.json`
- [x] T003 [P] Create `vitest.config.ts` targeting `tests/**/*.test.ts` with ESM transform **and a `resolve.alias` mapping `codemod:ast-grep` → `tests/__mocks__/ast-grep.ts`** so unit tests can call `validate()` without the JSSG runtime in `vitest.config.ts`; also create `tests/__mocks__/ast-grep.ts` with a heuristic mock implementing the ast-grep `parse` interface

**Checkpoint**: `npm install` succeeds; `npx tsc --noEmit` reports only "no input files"

---

## Phase 2: Foundational

**Purpose**: Shared types, render dispatcher skeleton, and public entry point. Must be complete before any user story phase can begin.

**⚠️ CRITICAL**: No user story implementation can begin until this phase is complete.

- [x] T004 Define all shared types in `src/types.ts` — `Visibility`, `FieldDeclaration`, `ParameterDeclaration`, `ElseIfClause`, `RustIrNode` discriminated union (7 variants), `ValidationResult`
- [x] T005 Create `render()` dispatcher skeleton in `src/render.ts` — exhaustive `switch (node.kind)` covering all 7 IR node kinds, each branch throwing `Error(\`render: ${node.kind} not yet implemented\`)`
- [x] T006 Create `src/index.ts` re-exporting everything from `src/types.ts`, `src/render.ts`, `src/validate.ts`, and all `src/nodes/*.ts` modules (stubs at this stage)

**Checkpoint**: `npx tsc --noEmit` compiles cleanly; `src/index.ts` exports are resolvable.

---

## Phase 3: User Story 7 — Validate detects errors (Priority: P1)

**Goal**: `validate()` correctly detects `ERROR` nodes in malformed Rust source and returns `{ ok: true }` for valid source, using a bundled tree-sitter-rust parser with no Node.js built-in dependencies.

**Independent Test**: Call `validate("pub struct {")` — assert `ok: false` with an error entry at the correct byte offset. Call `validate("pub struct Empty;")` — assert `ok: true`.

> **TDD**: Write T007 first. Confirm it fails. Then implement T008. Confirm T007 passes.

- [x] T007 [P] [US7] Write failing tests for `validate()` in `tests/unit/validate.test.ts` — three test cases: (1) valid Rust source returns `{ ok: true }`, (2) malformed source (e.g., `"pub struct {"` ) returns `{ ok: false, errors: [{ offset, kind }] }`, (3) Rust-keyword used as identifier (e.g., `"pub struct fn;"`) returns `{ ok: false }` — covers spec edge case "identifier is a Rust keyword"; tests must fail at this point (`validate.ts` is a stub)
- [x] T008 [US7] Implement `validate()` in `src/validate.ts` — import `parse` from `codemod:ast-grep`, call `parse("rust", source)`, use `.findAll({ rule: { kind: "ERROR" } })` to collect error nodes, map each to `{ offset: node.range().start.index, kind: "ERROR" }`, return `ValidationResult`; no WASM loading, no Node.js built-ins
- [x] T009 [US7] Run `tests/unit/validate.test.ts` — all cases pass; confirm `validate("pub struct {")` returns `ok: false` and `validate("pub struct Empty;")` returns `ok: true`

**Checkpoint**: US7 acceptance scenarios satisfied — SC-002 (`validate` detects malformed Rust in 100% of negative test cases).

---

## Phase 4: User Story 1 — Build and render a struct (Priority: P1) 🎯 MVP

**Goal**: `structItem()` constructs a `StructItem` IR node; `render(node)` emits a syntactically valid `struct` declaration that passes `validate()`.

**Independent Test**: Build a `StructItem` with two fields, call `render()`, call `validate()` on the result, assert `ok: true` and correct tree-sitter node kind `struct_item`.

> **TDD**: Write T010 first. Confirm it fails (render throws "not implemented"). Implement T011–T012. Confirm T010 passes.

- [x] T010 [P] [US1] Write failing tests in `tests/unit/render/struct.test.ts` — acceptance scenarios: (1) named fields + derives renders valid `pub struct` with `#[derive(...)]`, (2) zero-fields renders unit struct `pub struct Name;`, (3) `structItem({ name: "" })` throws a descriptive error; all positive cases call `validate()` and assert `ok: true`
- [x] T011 [P] [US1] Implement `StructItem` interface and `structItem()` factory in `src/nodes/struct.ts` — validate required fields at runtime (`name` non-empty, each field's `name`/`type` non-empty), default `fields: []` and `derives: []`
- [x] T012 [US1] Implement `struct_item` case in `src/render.ts` switch — emit `#[derive(...)]` when `derives` non-empty, named-field body or unit-struct form based on `fields.length`, prepend `pub` when `visibility === "pub"`
- [x] T013 [US1] Run `tests/unit/render/struct.test.ts` — all round-trip cases pass (`render` → `validate` → `ok: true`), negative cases verified

**Checkpoint**: US1 fully functional. `structItem` + `render` + `validate` loop works end-to-end.

---

## Phase 5: User Story 2 — Build and render a function (Priority: P1)

**Goal**: `functionItem()` + `render()` emits a syntactically valid `fn` declaration including optional return type, parameters, and visibility.

**Independent Test**: Build a `FunctionItem` with two params and a body, render, call `validate()`, assert `ok: true`.

> **TDD**: Write T014 first. Confirm it fails. Implement T015–T016. Confirm T014 passes.

- [x] T014 [P] [US2] Write failing tests in `tests/unit/render/function.test.ts` — acceptance scenarios: (1) params + explicit return type renders `pub fn name(p: T) -> R { ... }`, (2) no return type omits `->` clause, (3) `pub` visibility prepends correctly, (4) `functionItem({ name: "f", body: "" })` throws; all positive cases validate to `ok: true`
- [x] T015 [P] [US2] Implement `FunctionItem` interface and `functionItem()` factory in `src/nodes/function.ts` — validate `name` and `body` non-empty at runtime, default `params: []`
- [x] T016 [US2] Implement `function_item` case in `src/render.ts` switch — emit `fn name(params) -> ReturnType { body }`, omit `-> ReturnType` when `returnType` is `undefined`, prepend visibility
- [x] T017 [US2] Run `tests/unit/render/function.test.ts` — all cases pass with `validate()` confirming `ok: true`

**Checkpoint**: US1 + US2 both independently functional. `ImplItem` methods (US4) can now use `functionItem`.

---

## Phase 6: User Story 3 — Build and render a use declaration (Priority: P2)

**Goal**: `useDeclaration()` + `render()` emits `use path::Item;` (single) or `use path::{A, B};` (multi-item).

**Independent Test**: Build a `UseDeclaration` with path `["std", "collections"]` and items `["HashMap", "BTreeMap"]`, render, validate, assert `ok: true`.

> **TDD**: Write T018 first. Confirm it fails. Implement T019–T020. Confirm T018 passes.

- [x] T018 [P] [US3] Write failing tests in `tests/unit/render/use.test.ts` — acceptance scenarios: (1) multi-item path renders `use a::b::{X, Y};` with `ok: true`, (2) single item omits braces `use a::b::X;`, (3) empty `path` or `items` array throws
- [x] T019 [P] [US3] Implement `UseDeclaration` interface and `useDeclaration()` factory in `src/nodes/use.ts` — validate `path` and `items` are non-empty arrays of non-empty strings
- [x] T020 [US3] Implement `use_declaration` case in `src/render.ts` switch — join path with `::`, single item renders without braces, multi-item renders `{ A, B }`, append `;`
- [x] T021 [US3] Run `tests/unit/render/use.test.ts` — all cases pass with `validate()` confirming `ok: true`

**Checkpoint**: US3 complete. `SourceFile` composition (US8) can now include `UseDeclaration` nodes.

---

## Phase 7: User Story 4 — Build and render an impl block (Priority: P2)

**Goal**: `implItem()` + `render()` emits `impl Type { ... }` (inherent) or `impl Trait for Type { ... }` (trait impl) with properly rendered method bodies.

**Independent Test**: Build an `ImplItem` for type `Guard` implementing trait `Drop` with a `drop` method, render, validate, assert `ok: true` and output contains `impl Drop for Guard`.

> **TDD**: Write T022 first. Confirm it fails. Implement T023–T024. Confirm T022 passes.

- [x] T022 [P] [US4] Write failing tests in `tests/unit/render/impl.test.ts` — acceptance scenarios: (1) inherent impl renders `impl Type { fn method... }` with zero ERROR nodes, (2) trait impl renders `impl Drop for Guard { fn drop... }`, (3) `implItem({ type: "" })` throws
- [x] T023 [P] [US4] Implement `ImplItem` interface and `implItem()` factory in `src/nodes/impl.ts` — validate `type` non-empty, default `methods: []`, accept optional `trait`
- [x] T024 [US4] Implement `impl_item` case in `src/render.ts` switch — emit `impl Trait for Type { methods }` or `impl Type { methods }`, render each method via recursive `render()` call on the `FunctionItem`, indent method bodies
- [x] T025 [US4] Run `tests/unit/render/impl.test.ts` — all cases pass with `validate()` confirming `ok: true`

**Checkpoint**: US4 complete. The Drop translation pattern (`stage2-control.ts`) has a typed IR path.

---

## Phase 8: User Story 5 — Build and render an if expression (Priority: P2)

**Goal**: `ifExpression()` + `render()` emits `if … { } else if … { } else { }` chains that parse without ERROR nodes.

**Independent Test**: Build an `IfExpression` with a condition, one `else if` clause, and an `else` clause; render; validate; assert `ok: true`.

> **TDD**: Write T026 first. Confirm it fails. Implement T027–T028. Confirm T026 passes.

- [x] T026 [P] [US5] Write failing tests in `tests/unit/render/if.test.ts` — acceptance scenarios: (1) `if + else` renders with `else_clause` in parse tree, (2) two else-if clauses render without ERROR nodes, (3) no `else` omits else block entirely, (4) `ifExpression({ condition: "", consequence: "x" })` throws
- [x] T027 [P] [US5] Implement `IfExpression` interface, `ElseIfClause` interface, and `ifExpression()` factory in `src/nodes/if.ts` — validate `condition` and `consequence` non-empty, default `elseIfClauses: []`
- [x] T028 [US5] Implement `if_expression` case in `src/render.ts` switch — emit `if cond { cons }`, append ` else if cond { cons }` for each clause, append ` else { elseClause }` when present
- [x] T029 [US5] Run `tests/unit/render/if.test.ts` — all cases pass with `validate()` confirming `ok: true`

**Checkpoint**: US5 complete. Typed if/elif/else IR available for `stage1-syntax.ts` refactor.

---

## Phase 9: User Story 6 — Build and render a macro invocation (Priority: P3)

**Goal**: `macroInvocation()` + `render()` emits `macro!(tokens)` that tree-sitter parses as `macro_invocation`.

**Independent Test**: Build a `MacroInvocation` for `format!`, render, validate, assert `ok: true`.

> **TDD**: Write T030 first. Confirm it fails. Implement T031–T032. Confirm T030 passes.

- [x] T030 [P] [US6] Write failing tests in `tests/unit/render/macro.test.ts` — acceptance scenario: `macroInvocation({ macro: "format", tokens: '"hello {}", name' })` renders `format!("hello {}", name)` and parses as `macro_invocation`; empty `macro` or `tokens` throws
- [x] T031 [P] [US6] Implement `MacroInvocation` interface and `macroInvocation()` factory in `src/nodes/macro.ts` — validate `macro` and `tokens` non-empty
- [x] T032 [US6] Implement `macro_invocation` case in `src/render.ts` switch — emit `macro!(tokens)`
- [x] T033 [US6] Run `tests/unit/render/macro.test.ts` — acceptance scenario passes with `validate()` confirming `ok: true`

**Checkpoint**: US6 complete. All 6 individual node kinds implemented and tested.

---

## Phase 10: User Story 8 — Compose a source file (Priority: P3)

**Goal**: `sourceFile()` + `render()` assembles multiple top-level IR nodes into a complete Rust source file separated by blank lines, producing zero ERROR nodes in the full-file parse.

**Independent Test**: Build a `SourceFile` with `[UseDeclaration, StructItem, ImplItem]`, render, validate, assert `ok: true` and output parses as `source_file` with three top-level children.

> **TDD**: Write T034 first. Confirm it fails. Implement T035–T036. Confirm T034 passes.

- [x] T034 [P] [US8] Write failing tests in `tests/unit/render/source-file.test.ts` — acceptance scenario: `SourceFile` with `[UseDeclaration, StructItem, ImplItem]` renders with `\n\n` separation, output parses as `source_file` with three top-level children and zero ERROR nodes; `sourceFile({ items: [] })` throws
- [x] T035 [P] [US8] Implement `SourceFile` interface and `sourceFile()` factory in `src/nodes/source-file.ts` — validate `items` is non-empty array
- [x] T036 [US8] Implement `source_file` case in `src/render.ts` switch — map `items` through recursive `render()`, join with `\n\n`
- [x] T037 [US8] Run `tests/unit/render/source-file.test.ts` — all cases pass with `validate()` confirming `ok: true`

**Checkpoint**: All 7 node kinds implemented. SC-001 satisfied — every kind has a passing render+validate round-trip test.

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: TypeScript strict-mode gate, JSSG runtime integration test, and SC-004 real-world refactor validation.

- [x] T038 Run `npx tsc --noEmit` across entire project — fix any remaining strict-mode errors in `src/` and `tests/`; target: zero TypeScript errors (SC-003)
- [x] T039 [P] Write and run integration test in `tests/integration/jssg-compat.test.ts` — create a minimal JSSG transform fixture at `tests/fixtures/simple-struct.transform.ts` that imports `structItem`, `render`, `validate` from `rust-ir`; the test invokes the codemod runner against a trivial input fixture, asserts no runtime errors and `validate()` returns `ok: true` using the JSSG runtime's live `codemod:ast-grep` parser (no mock); confirms SC-005
- [ ] T040 Refactor `stage1-syntax.ts` in the Python-to-Rust refactory repo (`refactory-python-to-rust-phase0/` — sibling directory of this repo, branch `main`) to replace struct string-concatenation with `structItem()` + `render()` — run that repo's existing test suite to confirm Rust output is byte-identical to pre-refactor (SC-004). Coordinate: ensure `rust-ir` is published (or path-linked) before executing this task.
- [x] T041 [P] Run full Vitest suite (`npx vitest run`) — all unit and integration tests pass; confirm SC-001 (7 node kinds all have passing round-trip tests), SC-002 (validate detects malformed Rust in all negative cases), SC-003 (zero TS errors)

**Checkpoint**: All success criteria met. Library ready for merge.

---

## Dependency Graph

```
Phase 1 (Setup)
  └── Phase 2 (Foundational: types.ts + render skeleton + index.ts)
        └── Phase 3 (US7: validate.ts — MUST complete before Phase 4+)
              ├── Phase 4 (US1: struct_item)   ─┐
              ├── Phase 5 (US2: function_item)   ├── P1 stories — parallel with each other
              ├── Phase 6 (US3: use_declaration) ─┐
              ├── Phase 7 (US4: impl_item)         ├── P2 stories — US4 benefits from US2 done first
              ├── Phase 8 (US5: if_expression)   ──┘
              ├── Phase 9 (US6: macro_invocation) ─── P3, independent
              └── Phase 10 (US8: source_file)   ← uses all kinds; best after US1–US6
                    └── Phase 11 (Polish)
```

**Parallel opportunities within each story phase**:

- The test file task `[P]` and the node implementation file task `[P]` are always parallel — different files, no blocking dependency on each other
- The `render.ts` case task depends on the node implementation file being written first

**Phases 4–9 can be executed in parallel once Phase 3 is complete**, since they target independent source files. Exception: US4 (ImplItem) uses FunctionItem, so US2 should be complete first.

---

## Implementation Strategy

**MVP scope (T001–T037)**: Full library with all 7 node kinds, TDD tests, and `validate()` — delivers SC-001 and SC-002.

**Suggested iteration order**:

1. **Sprint 1 (MVP core)**: Phase 1 + 2 + 3 (setup, foundations, validate) → Phase 4 + 5 (struct + function, both P1)
2. **Sprint 2**: Phase 6 + 7 + 8 (use, impl, if — all P2)
3. **Sprint 3**: Phase 9 + 10 (macro, source file — both P3) + Phase 11 (polish, integration test, SC-004 refactor)

**Do NOT begin Phase 11 (polish)** until all 7 node kind tests pass — the `stage1-syntax.ts` refactor (T040) requires a complete, stable library.

---

## Task Summary

| Phase                | Story | Priority | Tasks        | Test count      |
| -------------------- | ----- | -------- | ------------ | --------------- |
| 1 – Setup            | —     | —        | T001–T003    | 0               |
| 2 – Foundational     | —     | —        | T004–T006    | 0               |
| 3 – Validate         | US7   | P1       | T007–T009    | 2 (pos + neg)   |
| 4 – Struct           | US1   | P1 🎯    | T010–T013    | 3               |
| 5 – Function         | US2   | P1       | T014–T017    | 4               |
| 6 – Use declaration  | US3   | P2       | T018–T021    | 3               |
| 7 – Impl block       | US4   | P2       | T022–T025    | 3               |
| 8 – If expression    | US5   | P2       | T026–T029    | 4               |
| 9 – Macro invocation | US6   | P3       | T030–T033    | 2               |
| 10 – Source file     | US8   | P3       | T034–T037    | 2               |
| 11 – Polish          | —     | —        | T038–T041    | 1 (integration) |
| **Total**            |       |          | **41 tasks** | **24 tests**    |
