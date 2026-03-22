<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px;">
    <CoarFormField label="Required" required>
      <CoarPlainDateTimePicker placeholder="DD.MM.YYYY HH:mm" :required="true" />
    </CoarFormField>
    <CoarFormField label="With Error" error="Invalid date/time">
      <CoarPlainDateTimePicker placeholder="DD.MM.YYYY HH:mm" />
    </CoarFormField>
    <CoarFormField label="Disabled">
      <CoarPlainDateTimePicker placeholder="DD.MM.YYYY HH:mm" :disabled="true" />
    </CoarFormField>
    <CoarFormField label="Readonly">
      <CoarPlainDateTimePicker placeholder="DD.MM.YYYY HH:mm" :readonly="true" />
    </CoarFormField>
  </div>
</template>

<script setup lang="ts">
import { CoarPlainDateTimePicker, CoarFormField } from '@cocoar/vue-ui';
</script>
