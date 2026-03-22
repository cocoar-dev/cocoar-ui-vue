<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 360px;">
    <CoarFormField label="Required" required>
      <CoarZonedDateTimePicker placeholder="DD.MM.YYYY HH:mm" :required="true" />
    </CoarFormField>
    <CoarFormField label="With Error" error="Invalid date/time">
      <CoarZonedDateTimePicker placeholder="DD.MM.YYYY HH:mm" />
    </CoarFormField>
    <CoarFormField label="Disabled">
      <CoarZonedDateTimePicker placeholder="DD.MM.YYYY HH:mm" :disabled="true" />
    </CoarFormField>
    <CoarFormField label="Readonly">
      <CoarZonedDateTimePicker placeholder="DD.MM.YYYY HH:mm" :readonly="true" />
    </CoarFormField>
  </div>
</template>

<script setup lang="ts">
import { CoarZonedDateTimePicker, CoarFormField } from '@cocoar/vue-ui';
</script>
