<template>
  <div style="max-width: 400px; height: 280px;">
    <CoarListbox
      :options="rows"
      :item-components="{ tag: TagRow }"
      label="Keywords"
      show-count
      @item-remove="remove"
      @item-action="onAction"
    />
    <p style="margin-top: 8px; font-size: 13px; color: #64748b;">
      Last action: {{ lastAction || '—' }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarListbox } from '@cocoar/vue-ui';
import type { CoarListboxOption } from '@cocoar/vue-ui';
import TagRow from './TagRow.vue';

const rows = ref<CoarListboxOption<string>[]>([
  { value: 'vue', label: 'vue', kind: 'tag' },
  { value: 'typescript', label: 'typescript', kind: 'tag' },
  { value: 'design-system', label: 'design-system', kind: 'tag' },
  { value: 'dnd', label: 'drag-and-drop', kind: 'tag' },
]);

const lastAction = ref('');

function remove(p: { item: CoarListboxOption<string> }) {
  rows.value = rows.value.filter((r) => r.value !== p.item.value);
  lastAction.value = `removed ${p.item.label}`;
}

function onAction(p: { item: CoarListboxOption<string>; name: string }) {
  lastAction.value = `${p.name} on ${p.item.label}`;
}
</script>
