<script setup lang="ts">
import { Temporal } from '@js-temporal/polyfill';
import { CoarPlainDatePicker } from '@cocoar/vue-ui';

const sizes = ['xs', 's', 'm', 'l'] as const;
const dateFormat = { pattern: 'dd.mm.yyyy', firstDayOfWeek: 1 } as const;
const value = Temporal.PlainDate.from('2026-03-14');
</script>

<template>
  <section class="vs-section">
    <h2 class="vs-title">Sizes: placeholder, value, clearable</h2>
    <div class="vs-grid">
      <template v-for="size in sizes" :key="size">
        <span class="vs-label">{{ size }}</span>
        <CoarPlainDatePicker
          :size="size"
          :model-value="null"
          placeholder="Pick a date"
          :date-format="dateFormat"
          locale="en-US"
        />
        <CoarPlainDatePicker
          :size="size"
          :model-value="value"
          :date-format="dateFormat"
          locale="en-US"
        />
        <CoarPlainDatePicker
          :size="size"
          :model-value="value"
          clearable
          :date-format="dateFormat"
          locale="en-US"
        />
      </template>
    </div>
  </section>

  <section class="vs-section">
    <h2 class="vs-title">States</h2>
    <div class="vs-grid">
      <span class="vs-label">disabled</span>
      <CoarPlainDatePicker
        :model-value="null"
        placeholder="Pick a date"
        disabled
        :date-format="dateFormat"
        locale="en-US"
      />
      <CoarPlainDatePicker :model-value="value" disabled :date-format="dateFormat" locale="en-US" />
      <CoarPlainDatePicker
        :model-value="value"
        disabled
        clearable
        :date-format="dateFormat"
        locale="en-US"
      />

      <span class="vs-label">readonly</span>
      <CoarPlainDatePicker
        :model-value="null"
        placeholder="Pick a date"
        readonly
        :date-format="dateFormat"
        locale="en-US"
      />
      <CoarPlainDatePicker :model-value="value" readonly :date-format="dateFormat" locale="en-US" />
      <CoarPlainDatePicker
        :model-value="value"
        readonly
        clearable
        :date-format="dateFormat"
        locale="en-US"
      />

      <span class="vs-label">error</span>
      <CoarPlainDatePicker
        :model-value="null"
        placeholder="Pick a date"
        error
        :date-format="dateFormat"
        locale="en-US"
      />
      <CoarPlainDatePicker :model-value="value" error :date-format="dateFormat" locale="en-US" />
      <CoarPlainDatePicker
        :model-value="value"
        error
        clearable
        :date-format="dateFormat"
        locale="en-US"
      />
    </div>
  </section>
</template>
