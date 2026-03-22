<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px;">
    <CoarPlainDateTimePicker label="Required" placeholder="DD.MM.YYYY HH:mm" :required="true" />
    <CoarPlainDateTimePicker label="With Error" placeholder="DD.MM.YYYY HH:mm" error="Invalid date/time" />
    <CoarPlainDateTimePicker label="Disabled" placeholder="DD.MM.YYYY HH:mm" :disabled="true" />
    <CoarPlainDateTimePicker label="Readonly" placeholder="DD.MM.YYYY HH:mm" :readonly="true" />
  </div>
</template>

<script setup lang="ts">
import { CoarPlainDateTimePicker } from '@cocoar/vue-ui';
</script>
