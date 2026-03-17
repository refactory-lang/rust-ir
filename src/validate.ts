/**
 * validate() — uses the JSSG runtime's `codemod:ast-grep` virtual module.
 * Implemented in Phase 3 (T008).
 */
import { parse } from 'codemod:ast-grep';
import type { RustGrammar, ValidationResult } from './types.js';

export function validate(source: string): ValidationResult {
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
}
