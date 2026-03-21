/**
 * Render an IR node to Rust source and validate the result.
 * Combines `render()` + `assertValid()` into a single call.
 */
import type { RustIrNode } from './types.js';
import { render } from './render.js';
import { assertValid } from './validate-fast.js';

export function renderValid(node: RustIrNode): string {
	return assertValid(render(node));
}
