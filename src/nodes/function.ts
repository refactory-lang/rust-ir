// Implemented in Phase 5 (T015)
export type { FunctionItem, FunctionItemConfig } from '../types.js';
import type { FunctionItem, FunctionItemConfig } from '../types.js';

export function functionItem(config: FunctionItemConfig): FunctionItem {
  if (!config.name) throw new Error('functionItem: name must be a non-empty string');
  if (!config.body) throw new Error('functionItem: body must be a non-empty string');
  return {
    kind: 'function_item',
    name: config.name as FunctionItem['name'],
    params: (config.params ?? []) as FunctionItem['params'],
    returnType: config.returnType as FunctionItem['returnType'],
    body: config.body as FunctionItem['body'],
    visibility: config.visibility
  };
}
