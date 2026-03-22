<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px;">
    <CoarPlainDatePicker label="Disabled" placeholder="DD.MM.YYYY" :disabled="true" />
    <CoarPlainDatePicker label="Readonly" placeholder="DD.MM.YYYY" :readonly="true" />
  </div>
</template>

<script setup lang="ts">
import { CoarPlainDatePicker } from '@cocoar/vue-ui';
</script>
