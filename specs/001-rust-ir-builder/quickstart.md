# Quickstart — rust-ir

> Typed Rust IR builder for JSSG transforms.

## What it does

`rust-ir` gives you factory functions that produce **typed IR nodes** for Rust syntax. You call `render(node)` to get valid Rust source, then `validate(rendered)` to confirm the tree-sitter parser sees no errors. No string concatenation, no hand-rolled templates — structured nodes all the way down.

---

## Installation

```bash
npm install rust-ir
# or: pnpm add rust-ir
```

**Requirements**:

- ESM project (`"type": "module"` in `package.json`)
- TypeScript strict mode (zero-error target)

---

## Basic Usage

### 1. Build and render a struct

```ts
import { structItem, render, validate } from 'rust-ir';

const node = structItem({
	name: 'Config',
	fields: [
		{ name: 'host', type: 'String' },
		{ name: 'port', type: 'u16' },
	],
	derives: ['Debug', 'Clone', 'PartialEq'],
	visibility: 'pub',
});

const src = render(node);
/*
#[derive(Debug, Clone, PartialEq)]
pub struct Config {
    host: String,
    port: u16,
}
*/

const result = validate(src);
// → { ok: true }
```

---

### 2. Build and render a function

```ts
import { functionItem, render, validate } from 'rust-ir';

const node = functionItem({
	name: 'process',
	params: [{ name: 'input', type: '&str' }],
	returnType: 'String',
	body: 'input.to_string()',
	visibility: 'pub',
});

const src = render(node);
/*
pub fn process(input: &str) -> String {
    input.to_string()
}
*/

const result = validate(src);
// → { ok: true }
```

---

### 3. Build a `use` declaration

```ts
import { useDeclaration, render } from 'rust-ir';

const node = useDeclaration({
	path: ['std', 'collections'],
	items: ['HashMap', 'BTreeMap'],
});

render(node);
// → "use std::collections::{HashMap, BTreeMap};"

// Single item — no braces:
render(useDeclaration({ path: ['std', 'fmt'], items: ['Write'] }));
// → "use std::fmt::Write;"
```

---

### 4. Build an impl block (with trait)

```ts
import { implItem, functionItem, render } from 'rust-ir';

const dropMethod = functionItem({
	name: 'drop',
	params: [{ name: 'self', type: '&mut Self' }],
	body: '// cleanup',
});

const node = implItem({
	type: 'Guard',
	trait: 'Drop',
	methods: [dropMethod],
});

const src = render(node);
/*
impl Drop for Guard {
    fn drop(&mut self) {
        // cleanup
    }
}
*/
```

---

### 5. Build an if / else-if / else expression

```ts
import { ifExpression, render } from 'rust-ir';

const node = ifExpression({
	condition: 'x > 0',
	consequence: 'Ok(x)',
	elseIfClauses: [{ condition: 'x == 0', consequence: 'Ok(0)' }],
	elseClause: 'Err("negative")',
});

render(node);
/*
if x > 0 {
    Ok(x)
} else if x == 0 {
    Ok(0)
} else {
    Err("negative")
}
*/
```

---

### 6. Build a macro invocation

```ts
import { macroInvocation, render } from 'rust-ir';

const node = macroInvocation({
	macro: 'format',
	tokens: '"hello {}", name',
});

render(node);
// → 'format!("hello {}", name)'
```

---

### 7. Compose a source file

```ts
import { sourceFile, useDeclaration, structItem, implItem, render, validate } from 'rust-ir';

const file = sourceFile({
	items: [
		useDeclaration({ path: ['std', 'fmt'], items: ['Display', 'Formatter'] }),
		structItem({
			name: 'Point',
			fields: [
				{ name: 'x', type: 'f64' },
				{ name: 'y', type: 'f64' },
			],
			derives: ['Debug'],
		}),
		implItem({ type: 'Point', methods: [] }),
	],
});

const src = render(file);
const result = validate(src);
// → { ok: true }
```

---

## Error Handling

Builder functions throw a descriptive `Error` at runtime if required fields are missing or invalid:

```ts
import { structItem } from 'rust-ir';

structItem({ name: '' });
// throws: Error: structItem: 'name' must be a non-empty string
```

Missing required fields are also caught at **compile time** by TypeScript:

```ts
structItem({}); // TS error: Property 'name' is missing
functionItem({ name: 'f' }); // TS error: Property 'body' is missing
```

---

## Validation API

`validate()` parses rendered Rust using the **bundled tree-sitter-rust WASM parser** (no separate install required):

```ts
import { validate } from 'rust-ir';

// Valid source
validate('pub struct Empty;');
// → { ok: true }

// Invalid source
validate('pub struct {');
// → { ok: false, errors: [{ offset: 11, kind: "ERROR" }] }
```

---

## Using in a JSSG Transform

```ts
// my-transform.ts  (runs inside Codemod JSSG runtime)
import type { FileContext } from '@codemod.com/jssg-types';
import { structItem, render, validate } from 'rust-ir';

export function transform(file: FileContext) {
	const node = structItem({ name: 'Config', fields: [{ name: 'value', type: 'i32' }] });
	const src = render(node);
	const result = validate(src);
	if (!result.ok) throw new Error(`IR validation failed: ${JSON.stringify(result.errors)}`);
	file.write(src);
}
```

The library uses only ESM imports compatible with `codemod:ast-grep` and has no Node.js built-in dependencies.

---

## TypeScript Tips

All IR node types are exported. Use them for typed intermediate variables:

```ts
import type { StructItem, FunctionItem, RustIrNode } from 'rust-ir';

const nodes: RustIrNode[] = [];
// TypeScript will enforce exhaustive switch on `node.kind`
for (const node of nodes) {
	switch (node.kind) {
		case 'struct_item':
			/* StructItem */ break;
		case 'function_item':
			/* FunctionItem */ break;
		// ... all 7 kinds
	}
}
```
