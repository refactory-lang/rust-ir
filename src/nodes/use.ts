// Implemented in Phase 6 (T019)
export type { UseDeclaration, UseDeclarationConfig } from '../types.js';
import type { UseDeclaration, UseDeclarationConfig } from '../types.js';

export function useDeclaration(config: UseDeclarationConfig): UseDeclaration {
  if (!config.argument || config.argument.trim().length === 0) {
    throw new Error('useDeclaration: argument must be a non-empty string');
  }
  return {
    kind: 'use_declaration',
    argument: config.argument as UseDeclaration['argument']
  };
}
