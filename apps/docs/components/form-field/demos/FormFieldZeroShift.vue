<template>
  <div class="zs-demo">
    <p class="zs-demo-instructions">
      Click <strong>Submit</strong> with empty fields — every required field flips
      to the error state at the same time. The labels shift right by the icon
      width: a small horizontal nudge that catches the eye, while the form's
      vertical layout stays put (no row appears below the input, the Submit
      button doesn't move). Hover any error icon for the message.
    </p>

    <div class="zs-form">
      <CoarFormField label="First name" :error="errors.first" required>
        <CoarTextInput v-model="first" placeholder="Jane" />
      </CoarFormField>
      <CoarFormField label="Last name" :error="errors.last" required>
        <CoarTextInput v-model="last" placeholder="Doe" />
      </CoarFormField>
      <CoarFormField label="Email" :error="errors.email" required>
        <CoarTextInput v-model="email" placeholder="jane@example.com" />
      </CoarFormField>
      <CoarFormField label="Account type" :error="errors.kind" required>
        <CoarSelect v-model="kind" :options="kinds" placeholder="Pick one" />
      </CoarFormField>
      <CoarFormField label="Country" :error="errors.country" required>
        <CoarSelect v-model="country" :options="countries" placeholder="Pick one" />
      </CoarFormField>
    </div>

    <div class="zs-actions">
      <CoarButton @click="reset">Reset</CoarButton>
      <CoarButton variant="primary" @click="submit">
        Submit{{ errorCount > 0 ? ` (${errorCount})` : '' }}
      </CoarButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import {
  CoarButton,
  CoarFormField,
  CoarSelect,
  CoarTextInput,
  type CoarSelectOption,
} from '@cocoar/vue-ui';

const first = ref('');
const last = ref('');
const email = ref('');
const kind = ref<string | null>(null);
const country = ref<string | null>(null);
const attempted = ref(false);

const kinds: CoarSelectOption<string>[] = [
  { value: 'personal', label: 'Personal' },
  { value: 'business', label: 'Business' },
];
const countries: CoarSelectOption<string>[] = [
  { value: 'us', label: 'United States' },
  { value: 'de', label: 'Germany' },
  { value: 'at', label: 'Austria' },
];

// Errors only populate after the first submit attempt — until then the form
// is "clean" even with empty fields. After the first submit, errors update
// reactively as the user types (live-revalidate). This is the most common
// on-submit pattern; CoarFormField doesn't care about the timing, it just
// reflects whatever string you pass.
const errors = reactive({
  first: '',
  last: '',
  email: '',
  kind: '',
  country: '',
});

const errorCount = computed(
  () => Object.values(errors).filter((m) => m.length > 0).length,
);

function validate() {
  errors.first = first.value.trim() ? '' : 'First name is required.';
  errors.last = last.value.trim() ? '' : 'Last name is required.';
  errors.email = email.value.trim()
    ? /.+@.+\..+/.test(email.value)
      ? ''
      : 'Enter a valid email address.'
    : 'Email is required.';
  errors.kind = kind.value ? '' : 'Pick an account type.';
  errors.country = country.value ? '' : 'Pick a country.';
}

function submit() {
  attempted.value = true;
  validate();
}

function reset() {
  first.value = '';
  last.value = '';
  email.value = '';
  kind.value = null;
  country.value = null;
  attempted.value = false;
  Object.assign(errors, { first: '', last: '', email: '', kind: '', country: '' });
}
</script>

<style scoped>
.zs-demo {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.zs-demo-instructions {
  margin: 0;
  font-size: 13px;
  color: var(--coar-text-neutral-secondary);
}
.zs-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  max-width: 560px;
}
.zs-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  max-width: 560px;
}
</style>
