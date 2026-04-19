<template>
  <div class="principal-row">
    <span class="icon" :class="`icon--${p.kind}`">{{ iconChar }}</span>
    <div class="meta">
      <div class="name">{{ p.name }}</div>
      <div class="sub">{{ p.sub }}</div>
    </div>
    <button
      v-if="side === 'selected'"
      type="button"
      class="remove"
      title="Remove"
      @click.stop="api.remove()"
    >×</button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { CoarListboxOption, CoarListboxItemApi, CoarListboxSide } from '@cocoar/vue-ui';

export interface Principal { id: string; kind: 'user' | 'group' | 'system'; name: string; sub: string }

const props = defineProps<{
  item: CoarListboxOption<Principal>;
  highlighted: boolean;
  selectable: boolean;
  side?: CoarListboxSide;
  api: CoarListboxItemApi<Principal>;
}>();

const p = computed(() => props.item.value);
const iconChar = computed(() => {
  if (p.value.kind === 'user') return '👤';
  if (p.value.kind === 'group') return '👥';
  return '⚙';
});
</script>

<style scoped>
.principal-row { display: flex; align-items: center; gap: 10px; width: 100%; }
.icon {
  width: 24px; height: 24px; border-radius: 4px;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; flex-shrink: 0;
}
.icon--user { background: #dbeafe; }
.icon--group { background: #fef3c7; }
.icon--system { background: #e5e7eb; }
.meta { flex: 1; min-width: 0; line-height: 1.2; }
.name { font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sub { font-size: 11px; color: #64748b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.remove {
  width: 22px; height: 22px;
  display: flex; align-items: center; justify-content: center;
  border: 1px solid #d1d5db;
  background: white;
  border-radius: 3px;
  cursor: pointer;
  color: #6b7280;
  font-size: 15px;
  line-height: 1;
  padding: 0;
  flex-shrink: 0;
}
.remove:hover { color: #dc2626; border-color: #dc2626; }
</style>
