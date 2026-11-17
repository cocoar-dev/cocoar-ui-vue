<script setup lang="ts">
import './compact-fonts';
/**
 * Compact profile (`.coar-compact`, Preview): the action buttons inside input frames
 * (`CoarInputFrameButton`) of the number input — steppers, clear, at min and max — and the
 * time picker's spinners (24 h, 12 h with period, min/max limits, disabled).
 */
import { ref } from 'vue';
import { CoarFormField, CoarNumberInput, CoarTimePicker } from '@cocoar/vue-ui';

const sizes = ['s', 'm', 'l'] as const;
const count = ref(5);
const time24 = ref({ hours: 9, minutes: 30 });
const time12 = ref({ hours: 14, minutes: 45 });
const atMax = ref({ hours: 17, minutes: 0 });
</script>

<template>
  <div class="coar-compact" data-interaction="field-actions">
    <section class="vs-section">
      <h2 class="vs-title">Number input frame actions: steppers and clear; at min; at max</h2>
      <div class="vs-grid">
        <template v-for="size in sizes" :key="size">
          <span class="vs-label">{{ size }}</span>
          <CoarNumberInput :size="size" :model-value="42" stepper-buttons="both" clearable />
          <CoarNumberInput :size="size" :model-value="0" :min="0" :max="10" stepper-buttons="both" />
          <CoarNumberInput :size="size" :model-value="10" :min="0" :max="10" stepper-buttons="both" />
        </template>
      </div>
    </section>
    <section class="vs-section">
      <h2 class="vs-title">Interactive: 0 ≤ v ≤ 10, step 1, clearable</h2>
      <div style="width: 220px" data-field="stepper">
        <CoarFormField label="Anzahl">
          <CoarNumberInput v-model="count" :min="0" :max="10" stepper-buttons="both" clearable />
        </CoarFormField>
      </div>
    </section>
    <section class="vs-section">
      <h2 class="vs-title">Time picker: 24 h; 12 h with period; at max 17:00; disabled</h2>
      <div class="vs-row" style="gap: 24px">
        <div data-time="24"><CoarTimePicker v-model="time24" :use24-hour="true" :minute-step="15" aria-label="Beginn" /></div>
        <div data-time="12"><CoarTimePicker v-model="time12" :use24-hour="false" aria-label="Ende" /></div>
        <div data-time="max"><CoarTimePicker v-model="atMax" :use24-hour="true" :max-time="{ hours: 17, minutes: 0 }" aria-label="Spätestens" /></div>
        <div data-time="disabled"><CoarTimePicker :model-value="{ hours: 8, minutes: 0 }" :use24-hour="true" disabled /></div>
      </div>
    </section>
  </div>
</template>
