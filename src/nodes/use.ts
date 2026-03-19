import type { UseDeclaration, UseDeclarationConfig } from '../types.js';

/**
 * Build a `use_declaration` IR node.
 * @throws {Error} if `argument` is empty or whitespace-only.
 */
export function useDeclaration(config: UseDeclarationConfig): UseDeclaration {
	if (typeof config.argument !== 'string' || config.argument.trim().length === 0) {
		throw new Error(
			`useDeclaration: argument must be a non-empty string, got: ${JSON.stringify(config.argument)}`,
		);
	}
	return {
		kind: 'use_declaration',
		argument: config.argument as UseDeclaration['argument'],
	};
}
