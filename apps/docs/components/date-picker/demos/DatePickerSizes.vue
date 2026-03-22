<template>
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px;">
    <CoarFormField label="Extra Small">
      <CoarPlainDatePicker size="xs" placeholder="DD.MM.YYYY" />
    </CoarFormField>
    <CoarFormField label="Small">
      <CoarPlainDatePicker size="s" placeholder="DD.MM.YYYY" />
    </CoarFormField>
    <CoarFormField label="Medium">
      <CoarPlainDatePicker size="m" placeholder="DD.MM.YYYY" />
    </CoarFormField>
    <CoarFormField label="Large">
      <CoarPlainDatePicker size="l" placeholder="DD.MM.YYYY" />
    </CoarFormField>
  </div>
</template>

<script setup lang="ts">
import { CoarPlainDatePicker, CoarFormField } from '@cocoar/vue-ui';
</script>
