// Implemented in Phase 7 (T023)
export type { ImplItem, ImplItemConfig } from '../types.js';
import type { ImplItem, ImplItemConfig } from '../types.js';

export function implItem(config: ImplItemConfig): ImplItem {
  if (!config.type) throw new Error('implItem: type must be a non-empty string');
  return {
    kind: 'impl_item',
    type: config.type as ImplItem['type'],
    trait: config.trait as ImplItem['trait'],
    methods: config.methods ?? []
  };
}
