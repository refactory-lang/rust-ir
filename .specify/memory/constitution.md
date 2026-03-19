<!--
Sync Impact Report:
- New constitution (v1.0.0) — no prior version to diff against.
- Templates checked: plan-template.md (Constitution Check section compatible), spec-template.md (no conflicts).
- No amendments to templates required.
-->

# rust-ir Constitution

## Core Principles

### I. Grammar Fidelity (NON-NEGOTIABLE)

Every IR node type MUST correspond 1-to-1 with a tree-sitter-rust grammar node kind. Node field names and child structure MUST mirror the tree-sitter grammar. No invented node kinds — if tree-sitter doesn't define it, the IR doesn't have it.

### II. Render-Then-Validate (NON-NEGOTIABLE)

Every IR node kind MUST have a corresponding case in the standalone `render(node: RustIrNode): string` dispatcher function. Every rendered string MUST be validated via `parse<Rust>("rust", rendered)` — if the parse tree contains an `ERROR` node, the render is rejected. No unvalidated Rust source may be emitted.

### III. Test-First

TDD mandatory: tests written → tests fail → then implement. Each IR node type requires at minimum: one render round-trip test (build → render → parse → no ERROR nodes) and one negative test (malformed input produces a clear error).

### IV. Minimal Surface Area

Only implement IR node kinds that active transforms actually need. Do not speculatively add node types. When a transform needs a new node kind, that constitutes a feature request that follows the spec workflow.

### V. JSSG Runtime Compatibility

The library MUST run inside the Codemod JSSG runtime. It MUST use only ESM imports compatible with `codemod:ast-grep`. It MUST NOT depend on Node.js built-ins (fs, path, child_process) or native addons. The library has **zero npm dependencies** at runtime — `validate()` calls `parse` from the `codemod:ast-grep` virtual module provided by the JSSG runtime. `@codemod.com/jssg-types` is a devDependency only (TypeScript type declarations).

## Technology Constraints

- **Language**: TypeScript (strict mode, `noEmit`)
- **Module system**: ESM (`"type": "module"`)
- **Runtime**: Codemod JSSG (ast-grep bindings via `codemod:ast-grep`)
- **Type source**: `@codemod.com/jssg-types` — Rust grammar types from `src/langs/rust.d.ts`
- **Test runner**: Vitest (runs outside JSSG, but tests import the same modules)
- **Zero npm runtime dependencies** — `codemod:ast-grep` is a JSSG runtime virtual module, not an npm package

## Quality Gates

- All IR node render tests pass before merge
- `parse<Rust>("rust", rendered)` validation produces zero `ERROR` nodes for all test fixtures
- TypeScript strict mode — zero type errors
- Every public API function has at least one test

## Governance

This constitution supersedes all other development practices for the rust-ir project. Amendments require: (1) a documented rationale, (2) review of impact on existing specs and implementations, and (3) version bump of this document. Constitution violations found during `/speckit.verify` are automatically CRITICAL severity.

**Version**: 1.1.0 | **Ratified**: 2025-07-19 | **Last Amended**: 2026-03-13
