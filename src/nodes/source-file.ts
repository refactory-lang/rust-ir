import type { SourceFile, SourceFileConfig } from '../types.js';

/**
 * Build a `source_file` IR node.
 * @throws {Error} if `children` is missing or an empty array.
 */
export function sourceFile(config: SourceFileConfig): SourceFile {
	if (!Array.isArray(config.children) || config.children.length === 0) {
		throw new Error(
			`sourceFile: children must be a non-empty array, got: ${JSON.stringify(config.children)}`,
		);
	}
	return {
		kind: 'source_file',
		children: config.children as SourceFile['children'],
	};
}
