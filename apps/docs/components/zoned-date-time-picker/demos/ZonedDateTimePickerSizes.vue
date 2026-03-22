<template>
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
    <CoarFormField label="Extra Small">
      <CoarZonedDateTimePicker size="xs" placeholder="DD.MM.YYYY HH:mm" />
    </CoarFormField>
    <CoarFormField label="Small">
      <CoarZonedDateTimePicker size="s" placeholder="DD.MM.YYYY HH:mm" />
    </CoarFormField>
    <CoarFormField label="Medium">
      <CoarZonedDateTimePicker size="m" placeholder="DD.MM.YYYY HH:mm" />
    </CoarFormField>
    <CoarFormField label="Large">
      <CoarZonedDateTimePicker size="l" placeholder="DD.MM.YYYY HH:mm" />
    </CoarFormField>
  </div>
</template>

<script setup lang="ts">
import { CoarZonedDateTimePicker, CoarFormField } from '@cocoar/vue-ui';
</script>
