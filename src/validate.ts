/**
 * Validate rendered Rust source code using the JSSG runtime's
 * `codemod:ast-grep` tree-sitter-rust parser.
 *
 * @returns `{ ok: true }` if no ERROR nodes; `{ ok: false, errors }` otherwise.
 * @throws {Error} if the tree-sitter parser itself fails (infrastructure error).
 */
import { parse } from 'codemod:ast-grep';
import type { RustGrammar, ValidationResult } from './types.js';

export function validate(source: string): ValidationResult {
	try {
		const root = parse<RustGrammar>('rust', source).root();
		const errorNodes = root.findAll('ERROR');
		if (errorNodes.length === 0) {
			return { ok: true };
		}
		return {
			ok: false,
			errors: errorNodes.map((n) => ({
				offset: n.range().start.index,
				kind: 'ERROR',
			})),
		};
	} catch (err: unknown) {
		throw new Error(
			`validate: tree-sitter parse failed: ${err instanceof Error ? err.message : String(err)}`,
			{ cause: err },
		);
	}
}
