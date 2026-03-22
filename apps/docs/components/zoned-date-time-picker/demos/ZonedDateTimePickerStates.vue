<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 360px;">
    <CoarZonedDateTimePicker label="Required" placeholder="DD.MM.YYYY HH:mm" :required="true" />
    <CoarZonedDateTimePicker label="With Error" placeholder="DD.MM.YYYY HH:mm" error="Invalid date/time" />
    <CoarZonedDateTimePicker label="Disabled" placeholder="DD.MM.YYYY HH:mm" :disabled="true" />
    <CoarZonedDateTimePicker label="Readonly" placeholder="DD.MM.YYYY HH:mm" :readonly="true" />
  </div>
</template>

<script setup lang="ts">
import { CoarZonedDateTimePicker } from '@cocoar/vue-ui';
</script>
