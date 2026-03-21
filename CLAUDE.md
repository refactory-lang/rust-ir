<!-- codemod-skill-discovery:begin -->
## Codemod Skill Discovery
This section is managed by `codemod` CLI.

- Core skill: `.agents/skills/codemod/SKILL.md`
- Package skills: `.agents/skills/<package-skill>/SKILL.md`
- List installed Codemod skills: `npx codemod agent list --harness antigravity --format json`

<!-- codemod-skill-discovery:end -->

## Project: rust-ir

Typed Rust IR (Intermediate Representation) builder for JSSG transforms. Part of the [refactory-lang](https://github.com/refactory-lang) organization. Builds structured Rust AST nodes from grammar-derived types, renders them to Rust source strings, and validates via tree-sitter parse. Zero runtime npm dependencies -- runs inside the Codemod JSSG runtime.

### Architecture

The package follows a **Builder -> Render -> Validate** pipeline:

1. **Build** -- Factory functions (`src/nodes/*.ts`) create typed IR nodes from grammar-derived types
2. **Render** -- `render(node)` converts any IR node to a Rust source string
3. **Validate** -- `validate(source)` parses via tree-sitter and checks for `ERROR` nodes

- **Node builders** (`src/nodes/`): 7 factory functions, one per Rust grammar node kind
- **Types** (`src/types.ts`): Grammar-derived TypeScript types for all IR nodes
- **Render** (`src/render.ts`): Recursive renderer that converts IR nodes to Rust source
- **Validate** (`src/validate.ts`): Tree-sitter-based validation for rendered output
- **Entry** (`src/index.ts`): Re-exports all public API
- **Specs** (`specs/`): Implementation specifications
- **Tests** (`tests/`): Vitest test suite

### Running

```bash
pnpm test          # run tests (vitest)
pnpm typecheck     # type check (tsgo)
```

### Key Files

| File | Purpose |
|------|---------|
| `src/index.ts` | Public API re-exports |
| `src/types.ts` | Grammar-derived IR node types |
| `src/render.ts` | IR node -> Rust source string renderer |
| `src/validate.ts` | Tree-sitter parse validation |
| `src/nodes/struct.ts` | `structItem()` builder |
| `src/nodes/function.ts` | `functionItem()` builder |
| `src/nodes/impl.ts` | `implItem()` builder |
| `src/nodes/use.ts` | `useDeclaration()` builder |
| `src/nodes/if.ts` | `ifExpression()` builder |
| `src/nodes/macro.ts` | `macroInvocation()` builder |
| `src/nodes/source-file.ts` | `sourceFile()` builder |
| `package.json` | Package config (ships TS source, no build step) |

### Conventions

- All node types are 100% grammar-derived from `@codemod.com/jssg-types`
- Package ships TypeScript source directly (`src/index.ts` as main entry); consumers must use a TS-aware bundler or the Codemod JSSG runtime
- Uses `pnpm` as package manager
- Type checking via `tsgo` (native TypeScript compiler)


### Speckit Workflow

This repo uses [speckit](https://github.com/speckit) for specification-driven development.

- **Specs**: `specs/<NNN-feature-name>/spec.md` — feature specifications
- **Plans**: `specs/<NNN-feature-name>/plan.md` — implementation plans with tasks
- **Checklists**: `specs/<NNN-feature-name>/checklists/` — quality gates
- **Templates**: `.specify/templates/` — spec, plan, task, checklist templates
- **Extensions**: `.specify/extensions/` — verify, sync, review, workflow hooks

**Branch convention**: Feature branches are named `<NNN>-<short-name>` matching the spec directory (e.g., `001-milestone1-pipeline`).

**Issue → Spec flow**: Issues labeled `ready-to-spec` trigger the `ready-to-spec-notify` workflow, which assigns Copilot to run the speckit workflow and produce a spec + plan + tasks.
