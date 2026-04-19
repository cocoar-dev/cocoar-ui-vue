<template>
  <div style="height: 320px;">
    <CoarDualListbox
      v-model="selected"
      :options="options"
      available-label="Available"
      selected-label="Selected"
    />
    <p style="margin-top: 8px; font-size: 13px; color: #64748b;">
      Selected: {{ selected.join(', ') || 'none' }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarDualListbox } from '@cocoar/vue-ui';
import type { CoarListboxOption } from '@cocoar/vue-ui';

const options: CoarListboxOption<string>[] = [
  { value: 'read', label: 'Read' },
  { value: 'write', label: 'Write' },
  { value: 'delete', label: 'Delete' },
  { value: 'admin', label: 'Admin' },
  { value: 'publish', label: 'Publish' },
  { value: 'review', label: 'Review' },
];

const selected = ref<string[]>(['read']);
</script>
