// Implemented in Phase 9 (T031)
export type { MacroInvocation, MacroInvocationConfig } from '../types.js';
import type { MacroInvocation, MacroInvocationConfig } from '../types.js';

export function macroInvocation(config: MacroInvocationConfig): MacroInvocation {
  if (!config.macro) throw new Error('macroInvocation: macro name must be a non-empty string');
  if (!config.tokens) throw new Error('macroInvocation: tokens must be a non-empty string');
  return {
    kind: 'macro_invocation',
    macro: config.macro as MacroInvocation['macro'],
    tokens: config.tokens as MacroInvocation['tokens']
  };
}
