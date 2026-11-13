<script setup lang="ts">
import { Temporal } from '@js-temporal/polyfill';
import { CoarZonedDateTimePicker } from '@cocoar/vue-ui';

const sizes = ['xs', 's', 'm', 'l'] as const;
const dateFormat = { pattern: 'dd.mm.yyyy', firstDayOfWeek: 1 } as const;
const value = Temporal.ZonedDateTime.from('2026-03-14T10:30:00+01:00[Europe/Vienna]');
</script>

<template>
  <section class="vs-section">
    <h2 class="vs-title">Sizes: placeholder, value</h2>
    <div class="vs-grid" style="--vs-columns: 2">
      <template v-for="size in sizes" :key="size">
        <span class="vs-label">{{ size }}</span>
        <CoarZonedDateTimePicker
          :size="size"
          :model-value="null"
          placeholder="Pick a date and time"
          :date-format="dateFormat"
          locale="en-US"
          time-zone="Europe/Vienna"
          :use24-hour="true"
        />
        <CoarZonedDateTimePicker
          :size="size"
          :model-value="value"
          :date-format="dateFormat"
          locale="en-US"
          time-zone="Europe/Vienna"
          :use24-hour="true"
        />
      </template>
    </div>
  </section>

  <section class="vs-section">
    <h2 class="vs-title">States (m): placeholder, value</h2>
    <div class="vs-grid" style="--vs-columns: 2">
      <span class="vs-label">clearable</span>
      <CoarZonedDateTimePicker
        :model-value="null"
        placeholder="Pick a date and time"
        clearable
        :date-format="dateFormat"
        locale="en-US"
        time-zone="Europe/Vienna"
        :use24-hour="true"
      />
      <CoarZonedDateTimePicker
        :model-value="value"
        clearable
        :date-format="dateFormat"
        locale="en-US"
        time-zone="Europe/Vienna"
        :use24-hour="true"
      />

      <span class="vs-label">disabled</span>
      <CoarZonedDateTimePicker
        :model-value="null"
        placeholder="Pick a date and time"
        disabled
        :date-format="dateFormat"
        locale="en-US"
        time-zone="Europe/Vienna"
        :use24-hour="true"
      />
      <CoarZonedDateTimePicker
        :model-value="value"
        disabled
        clearable
        :date-format="dateFormat"
        locale="en-US"
        time-zone="Europe/Vienna"
        :use24-hour="true"
      />

      <span class="vs-label">readonly</span>
      <CoarZonedDateTimePicker
        :model-value="null"
        placeholder="Pick a date and time"
        readonly
        :date-format="dateFormat"
        locale="en-US"
        time-zone="Europe/Vienna"
        :use24-hour="true"
      />
      <CoarZonedDateTimePicker
        :model-value="value"
        readonly
        clearable
        :date-format="dateFormat"
        locale="en-US"
        time-zone="Europe/Vienna"
        :use24-hour="true"
      />

      <span class="vs-label">error</span>
      <CoarZonedDateTimePicker
        :model-value="null"
        placeholder="Pick a date and time"
        error
        :date-format="dateFormat"
        locale="en-US"
        time-zone="Europe/Vienna"
        :use24-hour="true"
      />
      <CoarZonedDateTimePicker
        :model-value="value"
        error
        clearable
        :date-format="dateFormat"
        locale="en-US"
        time-zone="Europe/Vienna"
        :use24-hour="true"
      />
    </div>
  </section>
</template>
