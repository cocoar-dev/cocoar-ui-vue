<script setup lang="ts">
// A short form on a phone (390×844), photographed only in the mobile presentation (`modes: ["mobile"]`).
import { Temporal } from '@js-temporal/polyfill';
import {
  CoarButton,
  CoarCheckbox,
  CoarFormField,
  CoarNumberInput,
  CoarPlainDatePicker,
  CoarSegmentedControl,
  CoarSelect,
  CoarSwitch,
  CoarTextInput,
} from '@cocoar/vue-ui';

const rooms = [
  { value: 'single', label: 'Single room' },
  { value: 'double', label: 'Double room' },
];
const stays = [
  { value: 'day', label: 'Day' },
  { value: 'night', label: 'Night' },
  { value: 'week', label: 'Week' },
];
const dateFormat = { pattern: 'dd.mm.yyyy', firstDayOfWeek: 1 } as const;
const arrival = Temporal.PlainDate.from('2026-03-14');
</script>

<template>
  <form class="vs-stack" style="align-items: stretch" @submit.prevent>
    <h2 class="vs-title">Booking</h2>
    <CoarFormField label="Name" required>
      <CoarTextInput model-value="Ada Lovelace" />
    </CoarFormField>
    <CoarFormField label="Guests">
      <CoarNumberInput :model-value="2" :min="1" :max="6" stepper-buttons="both" />
    </CoarFormField>
    <CoarFormField label="Room">
      <CoarSelect :options="rooms" model-value="double" />
    </CoarFormField>
    <CoarFormField label="Arrival">
      <CoarPlainDatePicker :model-value="arrival" :date-format="dateFormat" />
    </CoarFormField>
    <CoarFormField label="Stay">
      <CoarSegmentedControl :options="stays" model-value="night" aria-label="Stay" />
    </CoarFormField>
    <CoarSwitch :model-value="true" label="Breakfast" />
    <CoarCheckbox label="I accept the terms" />
    <CoarButton variant="primary" full-width>Book</CoarButton>
    <CoarButton variant="secondary" full-width>Cancel</CoarButton>
  </form>
</template>
