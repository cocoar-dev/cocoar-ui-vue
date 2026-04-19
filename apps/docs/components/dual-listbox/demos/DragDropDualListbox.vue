<template>
  <div style="height: 320px;">
    <CoarDualListbox
      v-model="selected"
      :options="options"
      available-label="Roles"
      selected-label="Assigned"
      drag-drop
    />
    <p style="margin-top: 8px; font-size: 13px; color: #64748b;">
      Tip: drag from one column to the other. Or Ctrl/Shift-click to pick several first, then drag.
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarDualListbox } from '@cocoar/vue-ui';
import type { CoarListboxOption } from '@cocoar/vue-ui';

const options: CoarListboxOption<string>[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'editor', label: 'Editor' },
  { value: 'publisher', label: 'Publisher' },
  { value: 'reviewer', label: 'Reviewer' },
  { value: 'viewer', label: 'Viewer' },
  { value: 'billing', label: 'Billing' },
  { value: 'reporting', label: 'Reporting' },
];

const selected = ref<string[]>(['viewer']);
</script>
