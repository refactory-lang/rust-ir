// Implemented in Phase 4 (T011)
export type { StructItem, FieldDeclaration, StructItemConfig } from '../types.js';
import type { StructItem, StructItemConfig } from '../types.js';

export function structItem(config: StructItemConfig): StructItem {
  if (!config.name) throw new Error('structItem: name must be a non-empty string');
  return {
    kind: 'struct_item',
    name: config.name as StructItem['name'],
    body: config.body as StructItem['body'],
    typeParameters: config.typeParameters as StructItem['typeParameters'],
    children: config.children as StructItem['children'],
  };
}
