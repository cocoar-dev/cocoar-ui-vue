<template>
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
    <CoarPlainDateTimePicker size="xs" label="Extra Small" placeholder="DD.MM.YYYY HH:mm" />
    <CoarPlainDateTimePicker size="s" label="Small" placeholder="DD.MM.YYYY HH:mm" />
    <CoarPlainDateTimePicker size="m" label="Medium" placeholder="DD.MM.YYYY HH:mm" />
    <CoarPlainDateTimePicker size="l" label="Large" placeholder="DD.MM.YYYY HH:mm" />
  </div>
</template>

<script setup lang="ts">
import { CoarPlainDateTimePicker } from '@cocoar/vue-ui';
</script>
