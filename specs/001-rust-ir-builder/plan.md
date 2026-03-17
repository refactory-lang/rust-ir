# Implementation Plan: Rust IR Builder

**Branch**: `001-rust-ir-builder` | **Date**: 2026-03-13 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-rust-ir-builder/spec.md`

## Summary

Build a typed Rust IR builder library in TypeScript (ESM, strict mode) that provides discriminated-union IR nodes + factory functions for 7 Rust grammar node kinds, a standalone `render(node): string` function, and a `validate(source): ValidationResult` function that calls `parse` from the JSSG runtime's `codemod:ast-grep` virtual module. The library has zero npm runtime dependencies and runs exclusively inside the Codemod JSSG runtime.

## Technical Context

**Language/Version**: TypeScript 5.x, strict mode, ESM (`"type": "module"`)
**Primary Dependencies**: `@codemod.com/jssg-types` (devDep, TypeScript type declarations only); `codemod:ast-grep` (JSSG runtime virtual module — not an npm dep)
**Storage**: N/A
**Testing**: Vitest (ESM-native, runs outside JSSG); Vitest aliases `codemod:ast-grep` to `tests/__mocks__/ast-grep.ts` for unit tests
**Target Platform**: Codemod JSSG runtime (ast-grep bindings via `codemod:ast-grep`); Node.js for tests
**Project Type**: Library (ESM, used by JSSG transforms)
**Performance Goals**: Sub-millisecond render + validate for single IR nodes (typical transform output); not a bulk-processing system
**Constraints**: No Node.js built-ins (`fs`, `path`, `child_process`), no native addons, ESM imports only, zero npm runtime dependencies
**Scale/Scope**: 7 IR node kinds (struct, function, use, impl, if, macro, source_file); single-transform usage patterns

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                     | Gate                                                                                                | Status                                                                                                                                                                    |
| ----------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Grammar Fidelity           | Every IR node kind maps 1:1 to a tree-sitter-rust grammar node type; field names mirror the grammar | ✅ PASS — node kinds chosen directly from tree-sitter-rust grammar (struct_item, function_item, use_declaration, impl_item, if_expression, macro_invocation, source_file) |
| II. Render-Then-Validate      | Every IR node has `render()` output validated via `parse<Rust>`                                     | ✅ PASS — all tests follow build → render → validate round-trip; negative test required per kind                                                                          |
| III. Test-First               | TDD mandatory — tests written before implementation                                                 | ✅ PASS — tasks.md will sequence test files before implementation                                                                                                         |
| IV. Minimal Surface Area      | Only 7 node kinds needed by active transforms                                                       | ✅ PASS — node set bounded by FR-001; no speculative additions                                                                                                            |
| V. JSSG Runtime Compatibility | ESM only, no Node.js built-ins, no native addons; integration test required                         | ✅ PASS — `validate()` uses `parse` from `codemod:ast-grep` (JSSG virtual module, zero npm deps); integration test imports library inside a JSSG transform                |

**Post-Phase-1 re-check**: All gates remain PASS — data model and contracts introduce no new dependencies or abstractions beyond the 7 node kinds.

## Project Structure

### Documentation (this feature)

```text
specs/001-rust-ir-builder/
├── plan.md              # This file
├── research.md          # Phase 0 output (complete)
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── public-api.ts    # TypeScript public API contract
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
├── nodes/
│   ├── struct.ts          # StructItem type + structItem() factory
│   ├── function.ts        # FunctionItem type + functionItem() factory
│   ├── use.ts             # UseDeclaration type + useDeclaration() factory
│   ├── impl.ts            # ImplItem type + implItem() factory
│   ├── if.ts              # IfExpression type + ifExpression() factory
│   ├── macro.ts           # MacroInvocation type + macroInvocation() factory
│   └── source-file.ts     # SourceFile type + sourceFile() factory
├── types.ts               # RustIrNode union, ValidationResult, shared types
├── render.ts              # render(node: RustIrNode): string
├── validate.ts            # validate(source: string): ValidationResult
└── index.ts               # public re-exports

tests/
├── unit/
│   ├── render/
│   │   ├── struct.test.ts
│   │   ├── function.test.ts
│   │   ├── use.test.ts
│   │   ├── impl.test.ts
│   │   ├── if.test.ts
│   │   ├── macro.test.ts
│   │   └── source-file.test.ts
│   └── validate.test.ts
└── integration/
    └── jssg-compat.test.ts   # imports library in a JSSG transform, runs a fixture

package.json
tsconfig.json
vitest.config.ts
```

**Structure Decision**: Single-project library. `src/nodes/` isolates each IR node kind so tests can import individual modules without loading the full library. `render.ts` and `validate.ts` are top-level to reflect their status as the two primary public operations. All exports flow through `index.ts`.

## Complexity Tracking

> No constitution violations. No complexity justification required.
