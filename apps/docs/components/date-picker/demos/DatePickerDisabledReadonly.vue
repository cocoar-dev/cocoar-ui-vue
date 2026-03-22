<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px;">
    <CoarFormField label="Disabled">
      <CoarPlainDatePicker placeholder="DD.MM.YYYY" :disabled="true" />
    </CoarFormField>
    <CoarFormField label="Readonly">
      <CoarPlainDatePicker placeholder="DD.MM.YYYY" :readonly="true" />
    </CoarFormField>
  </div>
</template>

<script setup lang="ts">
import { CoarPlainDatePicker, CoarFormField } from '@cocoar/vue-ui';
</script>
