import type { ImplItem, ImplItemConfig } from '../types.js';

/**
 * Build an `impl_item` IR node.
 * @throws {Error} if `type` is empty or whitespace-only.
 */
export function implItem(config: ImplItemConfig): ImplItem {
	if (typeof config.type !== 'string' || config.type.trim().length === 0) {
		throw new Error(
			`implItem: type must be a non-empty string, got: ${JSON.stringify(config.type)}`,
		);
	}
	return {
		kind: 'impl_item',
		type: config.type as ImplItem['type'],
		trait: config.trait as ImplItem['trait'],
		body: config.body as ImplItem['body'],
		typeParameters: config.typeParameters as ImplItem['typeParameters'],
		children: config.children as ImplItem['children'],
	};
}
