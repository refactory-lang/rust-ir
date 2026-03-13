// Implemented in Phase 10 (T035)
export type { SourceFile, SourceFileConfig } from '../types.js';
import type { SourceFile, SourceFileConfig } from '../types.js';

export function sourceFile(config: SourceFileConfig): SourceFile {
  if (!config.children || config.children.length === 0) {
    throw new Error('sourceFile: children must be a non-empty array');
  }
  return {
    kind: 'source_file',
    children: config.children as SourceFile['children'],
  };
}
