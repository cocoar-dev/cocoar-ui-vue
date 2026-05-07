<template>
  <div style="display: flex; flex-direction: column; gap: 16px; align-items: flex-start;">
    <div>
      <p style="margin: 0 0 6px 0; font-size: 13px; color: var(--coar-text-neutral-secondary);">
        Whole control disabled
      </p>
      <CoarSegmentedControl
        v-model="status"
        :options="options"
        :disabled="true"
        aria-label="Disabled"
      />
    </div>
    <div>
      <p style="margin: 0 0 6px 0; font-size: 13px; color: var(--coar-text-neutral-secondary);">
        Single option disabled (Archived)
      </p>
      <CoarSegmentedControl
        v-model="status"
        :options="optionsWithDisabled"
        aria-label="Per-option disabled"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarSegmentedControl, type CoarSegmentedControlOption } from '@cocoar/vue-ui';

type Status = 'open' | 'closed' | 'archived';

const status = ref<Status>('open');
const options: CoarSegmentedControlOption<Status>[] = [
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
  { value: 'archived', label: 'Archived' },
];
const optionsWithDisabled: CoarSegmentedControlOption<Status>[] = [
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
  { value: 'archived', label: 'Archived', disabled: true },
];
</script>
