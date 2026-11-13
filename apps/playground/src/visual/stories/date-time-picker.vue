<script setup lang="ts">
import { Temporal } from '@js-temporal/polyfill';
import { CoarPlainDateTimePicker } from '@cocoar/vue-ui';

const sizes = ['xs', 's', 'm', 'l'] as const;
const dateFormat = { pattern: 'dd.mm.yyyy', firstDayOfWeek: 1 } as const;
const value = Temporal.PlainDateTime.from('2026-03-14T10:30');
</script>

<template>
  <section class="vs-section">
    <h2 class="vs-title">Sizes: placeholder, value</h2>
    <div class="vs-grid" style="--vs-columns: 2">
      <template v-for="size in sizes" :key="size">
        <span class="vs-label">{{ size }}</span>
        <CoarPlainDateTimePicker
          :size="size"
          :model-value="null"
          placeholder="Pick a date and time"
          :date-format="dateFormat"
          locale="en-US"
          :use24-hour="true"
        />
        <CoarPlainDateTimePicker
          :size="size"
          :model-value="value"
          :date-format="dateFormat"
          locale="en-US"
          :use24-hour="true"
        />
      </template>
    </div>
  </section>

  <section class="vs-section">
    <h2 class="vs-title">States (m): placeholder, value</h2>
    <div class="vs-grid" style="--vs-columns: 2">
      <span class="vs-label">clearable</span>
      <CoarPlainDateTimePicker
        :model-value="null"
        placeholder="Pick a date and time"
        clearable
        :date-format="dateFormat"
        locale="en-US"
        :use24-hour="true"
      />
      <CoarPlainDateTimePicker
        :model-value="value"
        clearable
        :date-format="dateFormat"
        locale="en-US"
        :use24-hour="true"
      />

      <span class="vs-label">disabled</span>
      <CoarPlainDateTimePicker
        :model-value="null"
        placeholder="Pick a date and time"
        disabled
        :date-format="dateFormat"
        locale="en-US"
        :use24-hour="true"
      />
      <CoarPlainDateTimePicker
        :model-value="value"
        disabled
        clearable
        :date-format="dateFormat"
        locale="en-US"
        :use24-hour="true"
      />

      <span class="vs-label">readonly</span>
      <CoarPlainDateTimePicker
        :model-value="null"
        placeholder="Pick a date and time"
        readonly
        :date-format="dateFormat"
        locale="en-US"
        :use24-hour="true"
      />
      <CoarPlainDateTimePicker
        :model-value="value"
        readonly
        clearable
        :date-format="dateFormat"
        locale="en-US"
        :use24-hour="true"
      />

      <span class="vs-label">error</span>
      <CoarPlainDateTimePicker
        :model-value="null"
        placeholder="Pick a date and time"
        error
        :date-format="dateFormat"
        locale="en-US"
        :use24-hour="true"
      />
      <CoarPlainDateTimePicker
        :model-value="value"
        error
        clearable
        :date-format="dateFormat"
        locale="en-US"
        :use24-hour="true"
      />
    </div>
  </section>
</template>
