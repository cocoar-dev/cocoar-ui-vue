<template>
  <p style="margin: 0; line-height: 2.4;">
    Reminder on
    <CoarPlainDateTimePicker v-model="at" appearance="inline" width="content" />
    for the whole team.
  </p>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import { CoarPlainDateTimePicker } from '@cocoar/vue-ui';

const at = ref<Temporal.PlainDateTime | null>(Temporal.PlainDateTime.from('2026-12-01T09:30'));
</script>
