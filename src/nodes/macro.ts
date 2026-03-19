import type { MacroInvocation, MacroInvocationConfig } from '../types.js';

/**
 * Build a `macro_invocation` IR node.
 * @throws {Error} if `macro` or `children` is empty or whitespace-only.
 */
export function macroInvocation(config: MacroInvocationConfig): MacroInvocation {
	if (typeof config.macro !== 'string' || config.macro.trim().length === 0) {
		throw new Error(
			`macroInvocation: macro name must be a non-empty string, got: ${JSON.stringify(config.macro)}`,
		);
	}
	if (typeof config.children !== 'string' || config.children.trim().length === 0) {
		throw new Error(
			`macroInvocation: children must be a non-empty string, got: ${JSON.stringify(config.children)}`,
		);
	}
	return {
		kind: 'macro_invocation',
		macro: config.macro as MacroInvocation['macro'],
		children: config.children as unknown as MacroInvocation['children'],
	};
}
