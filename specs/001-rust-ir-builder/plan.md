# Implementation Plan: Rust IR Builder

**Branch**: `feature/001-rust-ir-builder` | **Date**: 2025-07-19 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-rust-ir-builder/spec.md`

## Summary

Build a typed TypeScript library that constructs Rust AST IR nodes, renders them to source strings, and validates the output via tree-sitter `parse<Rust>`. The library replaces raw string concatenation in JSSG transforms with a type-safe builder API that guarantees syntactically valid Rust output. Seven node kinds (struct, function, use, impl, if, macro, source_file) plus a `validate()` utility.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode, `noEmit`)
**Primary Dependencies**: `@codemod.com/jssg-types` (Rust grammar types + `parse<Rust>` for validation)
**Storage**: N/A
**Testing**: Vitest (runs outside JSSG runtime; tests import same ESM modules)
**Target Platform**: Codemod JSSG runtime (ast-grep in-process, no Node.js built-ins)
**Project Type**: Library (npm package, consumed by JSSG transforms)
**Performance Goals**: Render any single node < 1ms (transforms process files serially)
**Constraints**: No Node.js built-ins (fs, path, child_process). ESM only. Single external dep (`@codemod.com/jssg-types`).
**Scale/Scope**: 7 IR node kinds, ~15 TypeScript source files, ~30 tests

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Grammar Fidelity | **PASS** | Each IR node maps to a named tree-sitter-rust kind: `struct_item`, `function_item`, `use_declaration`, `impl_item`, `if_expression`, `macro_invocation`, `source_file` |
| II. Render-Then-Validate | **PASS** | Every `render()` output will be validated via `parse<Rust>("rust", rendered)` in tests; `validate()` is a first-class export |
| III. Test-First | **PASS** | Phase 1 writes tests before implementation for each node kind |
| IV. Minimal Surface Area | **PASS** | Only 7 node kinds — exactly the set emitted by existing transforms in `python-to-rust` |
| V. JSSG Runtime Compatibility | **PASS** | ESM modules, sole dependency is `@codemod.com/jssg-types`, no Node built-ins |

## Architecture

### Design Approach: Configuration Objects + Render Functions

Each IR node is a plain TypeScript interface (the configuration) paired with a `render*()` function. This is simpler than a class hierarchy and plays well with tree-shaking.

```
┌─────────────────┐       ┌────────────────┐       ┌────────────────┐
│  Transform code  │──────▶│   IR Builder    │──────▶│   validate()   │
│  (JSSG runtime)  │       │  render*(cfg)   │       │  parse<Rust>   │
│                  │       │  → string       │       │  → errors[]    │
└─────────────────┘       └────────────────┘       └────────────────┘
```

**Not chosen — class-based nodes**: Classes with `render()` methods were considered but rejected because (a) JSSG runtime may not perfectly preserve prototype chains across module boundaries, (b) plain objects + functions are more predictable in ESM bundling, (c) no inheritance needed — all nodes are leaf types.

### Module Layout

```
src/
├── nodes/
│   ├── struct-item.ts      # StructItemConfig + renderStructItem()
│   ├── function-item.ts    # FunctionItemConfig + renderFunctionItem()
│   ├── use-declaration.ts  # UseDeclarationConfig + renderUseDeclaration()
│   ├── impl-item.ts        # ImplItemConfig + renderImplItem()
│   ├── if-expression.ts    # IfExpressionConfig + renderIfExpression()
│   ├── macro-invocation.ts # MacroInvocationConfig + renderMacroInvocation()
│   └── source-file.ts      # SourceFileConfig + renderSourceFile()
├── validate.ts             # validate(source) → ValidationResult
├── indent.ts               # indent(text, level) utility
└── index.ts                # Re-exports all public API

tests/
├── nodes/
│   ├── struct-item.test.ts
│   ├── function-item.test.ts
│   ├── use-declaration.test.ts
│   ├── impl-item.test.ts
│   ├── if-expression.test.ts
│   ├── macro-invocation.test.ts
│   └── source-file.test.ts
└── validate.test.ts
```

### Key Interfaces

```typescript
// ── struct-item.ts ──

interface FieldDeclaration {
  name: string;
  type: string;       // Rust type as string (e.g., "Vec<String>")
  visibility?: string; // default: "pub"
}

interface StructItemConfig {
  name: string;
  fields: FieldDeclaration[];
  derives?: string[];           // e.g., ["Debug", "Clone", "PartialEq"]
  visibility?: string;          // default: "pub"
}

function renderStructItem(config: StructItemConfig): string;
```

```typescript
// ── function-item.ts ──

interface Parameter {
  name: string;
  type: string;
}

interface FunctionItemConfig {
  name: string;
  params: Parameter[];
  returnType?: string;    // omit for no return type annotation
  body: string;           // raw Rust body (may be multi-line)
  visibility?: string;    // default: "pub"
}

function renderFunctionItem(config: FunctionItemConfig): string;
```

```typescript
// ── use-declaration.ts ──

interface UseDeclarationConfig {
  path: string[];         // ["std", "collections"]
  items: string[];        // ["HashMap", "BTreeMap"]; single item → no braces
}

function renderUseDeclaration(config: UseDeclarationConfig): string;
```

```typescript
// ── impl-item.ts ──

interface ImplItemConfig {
  type: string;               // struct name
  trait?: string;              // e.g., "Drop", "Display"
  methods: FunctionItemConfig[];
}

function renderImplItem(config: ImplItemConfig): string;
```

```typescript
// ── if-expression.ts ──

interface IfBranch {
  condition: string;
  body: string;
}

interface IfExpressionConfig {
  ifBranch: IfBranch;
  elseIfBranches?: IfBranch[];
  elseBranch?: string;          // body of else clause
}

function renderIfExpression(config: IfExpressionConfig): string;
```

```typescript
// ── macro-invocation.ts ──

interface MacroInvocationConfig {
  name: string;             // "format", "println", "vec"
  args: string;             // token tree content as string
}

function renderMacroInvocation(config: MacroInvocationConfig): string;
```

```typescript
// ── source-file.ts ──

type TopLevelNode =
  | { kind: "struct_item"; config: StructItemConfig }
  | { kind: "function_item"; config: FunctionItemConfig }
  | { kind: "use_declaration"; config: UseDeclarationConfig }
  | { kind: "impl_item"; config: ImplItemConfig };

interface SourceFileConfig {
  items: TopLevelNode[];
}

function renderSourceFile(config: SourceFileConfig): string;
```

```typescript
// ── validate.ts ──

type ValidationResult =
  | { ok: true }
  | { ok: false; errors: Array<{ offset: number; kind: string }> };

function validate(source: string): ValidationResult;
```

### Validation Strategy

`validate()` calls `parse<Rust>("rust", source)`, walks the resulting tree depth-first looking for nodes with kind `"ERROR"`, and collects their offset + parent kind. This is lightweight — tree-sitter parsing is fast and already available in the JSSG runtime.

**Test-time validation**: Every `render*()` test calls `validate()` on its output. This is the "Render-Then-Validate" loop from the constitution.

**Runtime validation**: Transforms can optionally call `validate()` on their final output. For production transforms it's recommended but not mandated (tree-sitter parse cost is negligible vs. the transform itself).

### Indentation Strategy

A shared `indent(text: string, level: number): string` utility adds `level * 4` spaces to each non-empty line. Render functions use this for bodies inside `{}` blocks. This keeps indentation logic out of the individual node renderers.

## Project Structure

### Documentation (this feature)

```text
specs/001-rust-ir-builder/
├── spec.md              # Feature specification
├── plan.md              # This file
└── tasks.md             # Task breakdown (next step)
```

### Source Code (repository root)

```text
src/
├── nodes/
│   ├── struct-item.ts
│   ├── function-item.ts
│   ├── use-declaration.ts
│   ├── impl-item.ts
│   ├── if-expression.ts
│   ├── macro-invocation.ts
│   └── source-file.ts
├── validate.ts
├── indent.ts
└── index.ts

tests/
├── nodes/
│   ├── struct-item.test.ts
│   ├── function-item.test.ts
│   ├── use-declaration.test.ts
│   ├── impl-item.test.ts
│   ├── if-expression.test.ts
│   ├── macro-invocation.test.ts
│   └── source-file.test.ts
└── validate.test.ts
```

**Structure Decision**: Single project / flat library. No `cli/`, no `services/` — this is a pure library with `src/` and `tests/`.

## Implementation Phases

### Phase 0: Project Scaffolding
- `package.json` with `"type": "module"`, devDependencies (`@codemod.com/jssg-types`, `typescript`, `vitest`)
- `tsconfig.json` (strict, ESM, `noEmit`, types from jssg-types)
- `vitest.config.ts`
- Empty `src/index.ts`
- Verify `vitest` runs with zero tests

### Phase 1: Core Infrastructure (P1 — validate + indent)
- `src/validate.ts` — `validate()` function
- `src/indent.ts` — `indent()` utility
- `tests/validate.test.ts` — positive and negative cases
- This unblocks all subsequent node implementations

### Phase 2: P1 Node Kinds (struct + function)
- `src/nodes/struct-item.ts` + `tests/nodes/struct-item.test.ts`
- `src/nodes/function-item.ts` + `tests/nodes/function-item.test.ts`
- `src/index.ts` re-exports
- These two cover the main output of `tier1-syntax.ts`

### Phase 3: P2 Node Kinds (use + impl + if)
- `src/nodes/use-declaration.ts` + tests
- `src/nodes/impl-item.ts` + tests (depends on function-item for methods)
- `src/nodes/if-expression.ts` + tests

### Phase 4: P3 Node Kinds (macro + source_file)
- `src/nodes/macro-invocation.ts` + tests
- `src/nodes/source-file.ts` + tests (depends on all other node renderers)

### Phase 5: Integration Proof
- Refactor `tier1-syntax.ts` struct emission in `python-to-rust` to use rust-ir's `renderStructItem()` instead of string concatenation
- Verify identical output via existing e2e test (`tests/e2e/run.sh`)

## Complexity Tracking

No constitution violations. No complexity justification needed.
