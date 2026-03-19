import type { IfExpression, IfExpressionConfig } from '../types.js';

/**
 * Build an `if_expression` IR node.
 * @throws {Error} if `condition` or `consequence` is empty or whitespace-only.
 */
export function ifExpression(config: IfExpressionConfig): IfExpression {
	if (typeof config.condition !== 'string' || config.condition.trim().length === 0) {
		throw new Error(
			`ifExpression: condition must be a non-empty string, got: ${JSON.stringify(config.condition)}`,
		);
	}
	if (typeof config.consequence !== 'string' || config.consequence.trim().length === 0) {
		throw new Error(
			`ifExpression: consequence must be a non-empty string, got: ${JSON.stringify(config.consequence)}`,
		);
	}
	return {
		kind: 'if_expression',
		condition: config.condition as IfExpression['condition'],
		consequence: config.consequence as unknown as IfExpression['consequence'],
		alternative: config.alternative as IfExpression['alternative'],
	};
}
