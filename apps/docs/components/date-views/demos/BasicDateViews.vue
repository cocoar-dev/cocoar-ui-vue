<template>
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <div>
      <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;">CoarPlainDateView</div>
      <CoarPlainDateView :value="date" />
    </div>
    <div>
      <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;">CoarPlainDateTimeView</div>
      <CoarPlainDateTimeView :value="dateTime" />
    </div>
    <div>
      <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;">CoarZonedDateTimeView</div>
      <CoarZonedDateTimeView :value="zoned" />
    </div>
    <div>
      <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;">Empty value with placeholder</div>
      <CoarPlainDateView :value="null" placeholder="No date set" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Temporal } from '@js-temporal/polyfill';
import {
  CoarPlainDateView,
  CoarPlainDateTimeView,
  CoarZonedDateTimeView,
} from '@cocoar/vue-ui';

const date = Temporal.PlainDate.from('2026-05-12');
const dateTime = Temporal.PlainDateTime.from('2026-05-12T14:30:00');
const zoned = Temporal.ZonedDateTime.from('2026-05-12T14:30:00[Europe/Vienna]');
</script>
