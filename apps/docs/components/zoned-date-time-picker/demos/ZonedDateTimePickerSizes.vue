<template>
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
    <CoarZonedDateTimePicker size="xs" label="Extra Small" placeholder="DD.MM.YYYY HH:mm" />
    <CoarZonedDateTimePicker size="s" label="Small" placeholder="DD.MM.YYYY HH:mm" />
    <CoarZonedDateTimePicker size="m" label="Medium" placeholder="DD.MM.YYYY HH:mm" />
    <CoarZonedDateTimePicker size="l" label="Large" placeholder="DD.MM.YYYY HH:mm" />
  </div>
</template>

<script setup lang="ts">
import { CoarZonedDateTimePicker } from '@cocoar/vue-ui';
</script>
