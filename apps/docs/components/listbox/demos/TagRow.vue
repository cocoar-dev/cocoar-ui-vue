<template>
  <div class="tag-row">
    <span class="label">{{ item.label }}</span>
    <button
      type="button"
      class="pin"
      title="Pin"
      @click.stop="api.action('pin')"
    >★</button>
    <button
      type="button"
      class="remove"
      title="Remove"
      @click.stop="api.remove()"
    >×</button>
  </div>
</template>

<script setup lang="ts">
import type { CoarListboxOption, CoarListboxItemApi } from '@cocoar/vue-ui';

defineProps<{
  item: CoarListboxOption<string>;
  highlighted: boolean;
  selectable: boolean;
  api: CoarListboxItemApi<string>;
}>();
</script>

<style scoped>
.tag-row { display: flex; align-items: center; gap: 8px; width: 100%; }
.label { flex: 1; font-family: monospace; }
.pin, .remove {
  width: 22px; height: 22px;
  border: 1px solid #d1d5db;
  background: white;
  border-radius: 3px;
  cursor: pointer;
  color: #6b7280;
  font-size: 14px;
  line-height: 1;
  padding: 0;
}
.pin:hover { color: #d97706; border-color: #d97706; }
.remove:hover { color: #dc2626; border-color: #dc2626; }
</style>
