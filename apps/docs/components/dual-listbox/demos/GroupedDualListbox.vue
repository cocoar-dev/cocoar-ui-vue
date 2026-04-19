<template>
  <div style="height: 360px;">
    <CoarDualListbox
      v-model="selected"
      :options="options"
      available-label="Roles"
      selected-label="Assigned"
      :search-fields="['label', 'group']"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarDualListbox } from '@cocoar/vue-ui';
import type { CoarListboxOption } from '@cocoar/vue-ui';

const options: CoarListboxOption<string>[] = [
  { value: 'admin', label: 'Admin', group: 'System' },
  { value: 'auditor', label: 'Auditor', group: 'System' },
  { value: 'editor', label: 'Editor', group: 'Content' },
  { value: 'publisher', label: 'Publisher', group: 'Content' },
  { value: 'reviewer', label: 'Reviewer', group: 'Content' },
  { value: 'viewer', label: 'Viewer', group: 'Content' },
  { value: 'billing', label: 'Billing', group: 'Finance' },
  { value: 'reporting', label: 'Reporting', group: 'Finance' },
];

const selected = ref<string[]>(['viewer']);
</script>
