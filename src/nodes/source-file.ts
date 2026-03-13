// Implemented in Phase 10 (T035)
export type { SourceFile, SourceFileConfig } from '../types.js';
import type { SourceFile, SourceFileConfig } from '../types.js';

export function sourceFile(config: SourceFileConfig): SourceFile {
  if (!config.items || config.items.length === 0) {
    throw new Error('sourceFile: items must be a non-empty array');
  }
  return {
    kind: 'source_file',
    items: config.items
  };
}
