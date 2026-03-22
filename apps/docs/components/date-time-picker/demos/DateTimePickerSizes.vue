<template>
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
    <CoarFormField label="Extra Small">
      <CoarPlainDateTimePicker size="xs" placeholder="DD.MM.YYYY HH:mm" />
    </CoarFormField>
    <CoarFormField label="Small">
      <CoarPlainDateTimePicker size="s" placeholder="DD.MM.YYYY HH:mm" />
    </CoarFormField>
    <CoarFormField label="Medium">
      <CoarPlainDateTimePicker size="m" placeholder="DD.MM.YYYY HH:mm" />
    </CoarFormField>
    <CoarFormField label="Large">
      <CoarPlainDateTimePicker size="l" placeholder="DD.MM.YYYY HH:mm" />
    </CoarFormField>
  </div>
</template>

<script setup lang="ts">
import { CoarPlainDateTimePicker, CoarFormField } from '@cocoar/vue-ui';
</script>
