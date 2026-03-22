<template>
  <div style="display: flex; flex-direction: column; gap: 16px; max-width: 320px;">
    <CoarFormField
      label="Username"
      :error="usernameError"
      required
    >
      <CoarTextInput v-model="username" placeholder="Choose a username" :required="true" />
    </CoarFormField>
    <CoarFormField
      label="Password"
      hint="At least 8 characters"
      :error="passwordError"
      required
    >
      <CoarPasswordInput v-model="password" placeholder="Enter password" :required="true" />
    </CoarFormField>
    <CoarFormField
      label="Country"
      :error="countryError"
      required
    >
      <CoarSelect v-model="country" :options="countries" placeholder="Select country" :required="true" />
    </CoarFormField>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { CoarTextInput, CoarPasswordInput, CoarSelect, CoarFormField } from '@cocoar/vue-ui';
import type { CoarSelectOption } from '@cocoar/vue-ui';

const username = ref('');
const password = ref('');
const country = ref<string | null>(null);

const usernameError = computed(() => {
  if (username.value.length === 0) return '';
  if (username.value.length < 3) return 'Username must be at least 3 characters';
  return '';
});

const passwordError = computed(() => {
  if (password.value.length === 0) return '';
  if (password.value.length < 8) return 'Password must be at least 8 characters';
  return '';
});

const countryError = computed(() => '');

const countries: CoarSelectOption<string>[] = [
  { value: 'us', label: 'United States' },
  { value: 'de', label: 'Germany' },
  { value: 'fr', label: 'France' },
  { value: 'jp', label: 'Japan' },
];
</script>
