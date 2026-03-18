# rust-ir

Typed Rust IR builder for JSSG transforms — builds structured Rust AST nodes, renders to source, validates via tree-sitter parse.

## Install

```sh
pnpm add rust-ir
```

## Quick Start

```ts
import { structItem, functionItem, implItem, sourceFile, render, validate } from 'rust-ir';

// Build IR nodes
const struct = structItem({
  name: 'Config',
  body: '    host: String,\n    port: u16,',
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

**Builder → Render → Validate** pipeline:

1. **Build** — factory functions create typed IR nodes from grammar-derived types
2. **Render** — `render(node)` converts any IR node to a Rust source string
3. **Validate** — `validate(source)` parses via tree-sitter and checks for `ERROR` nodes

All node types are 100% grammar-derived from `@codemod.com/jssg-types`. Zero runtime npm dependencies — runs inside the Codemod JSSG runtime.

## Development

```sh
pnpm test          # run tests (vitest)
pnpm typecheck     # type check (tsgo)
```
