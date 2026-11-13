<script setup lang="ts">
import { CoarCheckbox, CoarFormField, CoarSelect, CoarTextInput } from '@cocoar/vue-ui';

const options = [
  { value: 'de', label: 'German' },
  { value: 'en', label: 'English' },
];
const rules = [
  { label: 'At least 8 characters', fulfilled: true },
  { label: 'An uppercase letter', fulfilled: false },
  { label: 'A digit', fulfilled: false, whenFail: 'warning' as const },
];
</script>

<template>
  <section class="vs-section">
    <h2 class="vs-title">
      Stacked: label, hint, required, error, warning, several errors, rules, disabled
    </h2>
    <div
      class="vs-grid"
      style="--vs-columns: 2; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: start"
    >
      <CoarFormField label="Name" hint="As shown on your profile">
        <CoarTextInput model-value="Ada Lovelace" />
      </CoarFormField>
      <CoarFormField label="Email" required>
        <CoarTextInput placeholder="name@example.com" />
      </CoarFormField>
      <CoarFormField label="Email" error="Enter a valid email address" required>
        <CoarTextInput model-value="ada@" />
      </CoarFormField>
      <CoarFormField label="Password" warning="This password is on the common-passwords list">
        <CoarTextInput model-value="password1" />
      </CoarFormField>
      <CoarFormField
        label="Password"
        :error="['Too short (min 8 characters)', 'Needs an uppercase letter']"
      >
        <CoarTextInput model-value="abc" />
      </CoarFormField>
      <CoarFormField label="Password" :rules="rules" hint="Choose a strong password">
        <CoarTextInput model-value="abcdefgh" />
      </CoarFormField>
      <CoarFormField label="Language" hint="Disabled field" disabled>
        <CoarSelect :options="options" model-value="de" />
      </CoarFormField>
      <CoarFormField label="Terms" error="Please accept the terms">
        <CoarCheckbox label="I accept the terms" />
      </CoarFormField>
    </div>
  </section>

  <section class="vs-section">
    <h2 class="vs-title">Inline layout, label after</h2>
    <div class="vs-stack" style="align-items: stretch; max-width: 520px">
      <CoarFormField label="Display name" layout="inline" hint="Visible to everyone">
        <CoarTextInput model-value="ada" />
      </CoarFormField>
      <CoarFormField label="Language" layout="inline" error="Pick a language" required>
        <CoarSelect :options="options" :model-value="null" placeholder="Choose" />
      </CoarFormField>
      <CoarFormField label="Send me the newsletter" layout="inline" label-position="after">
        <CoarCheckbox />
      </CoarFormField>
    </div>
  </section>
</template>
