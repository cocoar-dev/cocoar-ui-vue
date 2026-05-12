<template>
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <div style="display: flex; gap: 8px; align-items: center;">
      <span style="font-size: 13px; color: #64748b;">Locale:</span>
      <CoarSegmentedControl v-model="locale" :options="locales" size="s" />
    </div>
    <div style="display: grid; grid-template-columns: 200px 1fr; gap: 8px 16px; font-size: 14px;">
      <span style="color: #64748b;">PlainDate</span>
      <CoarPlainDateView :value="date" :locale="locale" />
      <span style="color: #64748b;">PlainDateTime (24h auto)</span>
      <CoarPlainDateTimeView :value="dateTime" :locale="locale" />
      <span style="color: #64748b;">ZonedDateTime</span>
      <CoarZonedDateTimeView :value="zoned" :locale="locale" />
    </div>
    <div style="font-size: 12px; color: #64748b;">
      The format pattern (DD.MM.YYYY vs MM/DD/YYYY) and the 12h/24h clock are both derived from the locale via <code>useDatePickerBase</code> — same resolution chain the editor pickers use.
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import {
  CoarPlainDateView,
  CoarPlainDateTimeView,
  CoarZonedDateTimeView,
  CoarSegmentedControl,
} from '@cocoar/vue-ui';

const locale = ref('de-AT');
const locales = [
  { value: 'de-AT', label: 'de-AT' },
  { value: 'de-DE', label: 'de-DE' },
  { value: 'en-US', label: 'en-US' },
  { value: 'en-GB', label: 'en-GB' },
  { value: 'fr-FR', label: 'fr-FR' },
];

const date = Temporal.PlainDate.from('2026-05-12');
const dateTime = Temporal.PlainDateTime.from('2026-05-12T14:30:00');
const zoned = Temporal.ZonedDateTime.from('2026-05-12T14:30:00[Europe/Vienna]');
</script>
