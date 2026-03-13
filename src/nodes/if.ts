// Implemented in Phase 8 (T027)
export type { IfExpression, ElseIfClause, IfExpressionConfig } from '../types.js';
import type { IfExpression, IfExpressionConfig } from '../types.js';

export function ifExpression(config: IfExpressionConfig): IfExpression {
  if (!config.condition) throw new Error('ifExpression: condition must be a non-empty string');
  if (!config.consequence) throw new Error('ifExpression: consequence must be a non-empty string');
  return {
    kind: 'if_expression',
    condition: config.condition as IfExpression['condition'],
    consequence: config.consequence as IfExpression['consequence'],
    elseIfClauses: (config.elseIfClauses ?? []) as IfExpression['elseIfClauses'],
    elseClause: config.elseClause as IfExpression['elseClause']
  };
}
