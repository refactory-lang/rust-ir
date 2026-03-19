import type { StructItem, StructItemConfig } from '../types.js';

/**
 * Build a `struct_item` IR node.
 * @throws {Error} if `name` is empty or whitespace-only.
 */
export function structItem(config: StructItemConfig): StructItem {
	if (typeof config.name !== 'string' || config.name.trim().length === 0) {
		throw new Error(
			`structItem: name must be a non-empty string, got: ${JSON.stringify(config.name)}`,
		);
	}
	return {
		kind: 'struct_item',
		name: config.name as StructItem['name'],
		body: config.body as StructItem['body'],
		typeParameters: config.typeParameters as StructItem['typeParameters'],
		children: config.children as StructItem['children'],
	};
}
