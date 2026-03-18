import type { FunctionItem, FunctionItemConfig } from '../types.js';

/**
 * Build a `function_item` IR node.
 * @throws {Error} if `name` or `body` is empty or whitespace-only.
 */
export function functionItem(config: FunctionItemConfig): FunctionItem {
	if (typeof config.name !== 'string' || config.name.trim().length === 0) {
		throw new Error(
			`functionItem: name must be a non-empty string, got: ${JSON.stringify(config.name)}`,
		);
	}
	if (typeof config.body !== 'string' || config.body.trim().length === 0) {
		throw new Error(
			`functionItem: body must be a non-empty string, got: ${JSON.stringify(config.body)}`,
		);
	}
	return {
		kind: 'function_item',
		name: config.name as FunctionItem['name'],
		parameters: config.parameters as FunctionItem['parameters'],
		returnType: config.returnType as FunctionItem['returnType'],
		body: config.body as unknown as FunctionItem['body'],
		typeParameters: config.typeParameters as FunctionItem['typeParameters'],
		children: config.children as FunctionItem['children'],
	};
}
