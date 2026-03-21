# rust-ir

Typed Rust IR builder for JSSG transforms — builds structured Rust AST nodes, renders to source, validates via tree-sitter parse.

## Install

```sh
pnpm add rust-ir
```

> **Note:** This package ships TypeScript source (`src/index.ts`). Consumers must use a TS-aware bundler (e.g. Vite, esbuild) or loader (e.g. `ts-node`, `tsx`). It is designed to run inside the [Codemod JSSG](https://docs.codemod.com) runtime, which handles TypeScript compilation natively.

## Quick Start — Fluent Builder API (preferred)

```ts
import { ir, assertValid } from '@refactory/rust-ir';

// Build and render in one chain
ir.fn('greet').pub().params('name: &str').returns('String').body('format!("Hello, {name}")').render()
ir.struct('Point').pub().body('pub x: f64,\npub y: f64').render()
ir.use('std::collections::HashMap').render()
ir.impl('Foo').trait('Display').body('...').render()
ir.if('x > 0').then('x').else_('0').render()
ir.macro('println').args('"hello"').render()
ir.file([...items]).render()
```

The `ir.*` namespace implements `BuilderTerminal` from `@refactory/grammar-types`. Each builder chain produces a Rust source string via `.render()`.

### Render and Validation

| Export | Description |
|--------|-------------|
| `render(node)` | Render with validation (default) |
| `renderSilent(node)` | Render without validation |
| `assertValid(source)` | Throw if source has syntax errors (regex-based) |
| `validateFast(source)` | Regex-based validation (returns result object) |
| `validate(source)` | Full tree-sitter parse validation |

## Factory Functions (config-object API)

The original config-object API is still supported:

```ts
import { structItem, functionItem, implItem, sourceFile, render, validate } from '@refactory/rust-ir';

// Build IR nodes
const struct = structItem({
  name: 'Config',
  body: 'host: String,\nport: u16,',
  children: ['pub'],
});

const method = functionItem({
  name: 'new',
  parameters: 'host: String, port: u16',
  returnType: 'Self',
  body: 'Self { host, port }',
  children: ['pub'],
});

const impl = implItem({
  type: 'Config',
  body: render(method),
});

const file = sourceFile({
  children: [render(struct), render(impl)],
});

// Render to Rust source
const source = render(file);

// Validate via tree-sitter parse
const result = validate(source);
console.log(result.ok); // true
```

## Supported Node Kinds

| Builder | Grammar Node | Required Fields |
|---|---|---|
| `structItem()` | `struct_item` | `name` |
| `functionItem()` | `function_item` | `name`, `body` |
| `useDeclaration()` | `use_declaration` | `argument` |
| `implItem()` | `impl_item` | `type` |
| `ifExpression()` | `if_expression` | `condition`, `consequence` |
| `macroInvocation()` | `macro_invocation` | `macro`, `children` |
| `sourceFile()` | `source_file` | `children` |

## Architecture

**Build → Render → Validate** pipeline:

1. **Build** — fluent builders (`ir.*`) or factory functions create typed IR nodes from grammar-derived types
2. **Render** — `render(node)` renders with validation, `renderSilent(node)` renders without
3. **Validate** — `validate(source)` (tree-sitter), `validateFast(source)`/`assertValid(source)` (regex-based)

All node types are 100% grammar-derived from `@codemod.com/jssg-types`. The `ir.*` fluent namespace implements `BuilderTerminal` from `@refactory/grammar-types`. Zero runtime npm dependencies — runs inside the Codemod JSSG runtime.

## Development

```sh
pnpm test          # run tests (vitest)
pnpm typecheck     # type check (tsgo)
```
