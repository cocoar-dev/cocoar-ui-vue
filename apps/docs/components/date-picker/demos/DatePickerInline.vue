<template>
  <p style="margin: 0; line-height: 2.4;">
    Valid from
    <CoarPlainDatePicker v-model="from" appearance="inline" width="content" />
    to
    <CoarPlainDatePicker v-model="to" appearance="inline" width="content" />
  </p>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import { CoarPlainDatePicker } from '@cocoar/vue-ui';

const from = ref<Temporal.PlainDate | null>(Temporal.PlainDate.from('2026-12-01'));
const to = ref<Temporal.PlainDate | null>(null);
</script>
