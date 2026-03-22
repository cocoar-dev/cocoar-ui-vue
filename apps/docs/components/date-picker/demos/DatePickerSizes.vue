<template>
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px;">
    <CoarPlainDatePicker size="xs" label="Extra Small" placeholder="DD.MM.YYYY" />
    <CoarPlainDatePicker size="s" label="Small" placeholder="DD.MM.YYYY" />
    <CoarPlainDatePicker size="m" label="Medium" placeholder="DD.MM.YYYY" />
    <CoarPlainDatePicker size="l" label="Large" placeholder="DD.MM.YYYY" />
  </div>
</template>

<script setup lang="ts">
import { CoarPlainDatePicker } from '@cocoar/vue-ui';
</script>
