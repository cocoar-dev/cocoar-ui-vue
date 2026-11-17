<script setup lang="ts">
import type { Component } from 'vue';
import { useRoute } from 'vue-router';
import { Temporal } from '@js-temporal/polyfill';
import {
  CoarMultiSelect, CoarNumberInput, CoarOtpInput, CoarPasswordInput,
  CoarPlainDatePicker, CoarPlainDateTimePicker, CoarSelect, CoarTagSelect,
  CoarTextInput, CoarThemeScope, CoarTimePicker, CoarZonedDateTimePicker,
} from '@cocoar/vue-ui';
import '../../../../packages/ui/src/compact-fonts';

const route = useRoute();
const mobile = route.query.mobile === 'true';
const mode = route.query.mode === 'dark' ? 'dark' : 'light';
const sizes = ['xs', 's', 'm', 'l'] as const;
const options = [{ value: 'one', label: 'Eintrag eins' }, { value: 'two', label: 'Eintrag zwei' }];
const fields: { id: string; component: Component; props: Record<string, unknown> }[] = [
  { id: 'text', component: CoarTextInput, props: { modelValue: 'Überweisung', clearable: true } },
  { id: 'textarea', component: CoarTextInput, props: { modelValue: 'Mehrzeiliger Text', rows: 3 } },
  { id: 'password', component: CoarPasswordInput, props: { modelValue: 'Synthetic-42' } },
  { id: 'number', component: CoarNumberInput, props: { modelValue: 1234.5, suffix: '€' } },
  { id: 'select', component: CoarSelect, props: { modelValue: 'one', options, searchable: true } },
  { id: 'multi', component: CoarMultiSelect, props: { modelValue: ['one'], options, searchable: true } },
  { id: 'tags', component: CoarTagSelect, props: { modelValue: ['one'], options } },
  { id: 'date', component: CoarPlainDatePicker, props: { modelValue: Temporal.PlainDate.from('2026-11-15') } },
  { id: 'date-time', component: CoarPlainDateTimePicker, props: { modelValue: Temporal.PlainDateTime.from('2026-11-15T14:30') } },
  { id: 'zoned', component: CoarZonedDateTimePicker, props: { modelValue: Temporal.ZonedDateTime.from('2026-11-15T14:30[Europe/Vienna]') } },
  { id: 'time', component: CoarTimePicker, props: { modelValue: { hours: 14, minutes: 30 } } },
  { id: 'otp', component: CoarOtpInput, props: { modelValue: '123456' } },
];
</script>

<template>
  <CoarThemeScope :mode="mode">
    <main class="field-size-review">
      <section
        v-for="profile in ['legacy', 'compact']"
        :key="profile"
        :data-font-profile="profile"
        :class="{ 'coar-compact': profile === 'compact', 'coar-mobile': mobile }"
      >
        <h1>{{ profile }}</h1>
        <div data-font-content>
          <section v-for="size in sizes" :key="size" :data-font-size="size">
            <h2>{{ size }}</h2>
            <div class="field-size-grid">
              <div v-for="field in fields" :key="field.id" :data-font-family="field.id">
                <p>{{ field.id }}</p>
                <component :is="field.component" v-bind="field.props" :size="size" />
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  </CoarThemeScope>
</template>

<style scoped>
.field-size-review { display: grid; gap: 24px; padding: 16px; }
.field-size-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
@media (max-width: 600px) {
  .field-size-grid { grid-template-columns: minmax(0, 1fr); }
}
</style>
