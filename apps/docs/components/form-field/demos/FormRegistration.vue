<template>
  <form class="demo-form" @submit.prevent="onSubmit">
    <CoarFormField label="Full Name" :error="errors.name" required>
      <CoarTextInput v-model="form.name" placeholder="Jane Doe" required />
    </CoarFormField>

    <CoarFormField label="Email" :error="errors.email" hint="We'll never share your email" required>
      <CoarTextInput v-model="form.email" placeholder="jane@example.com" required />
    </CoarFormField>

    <CoarFormField label="Password" :error="errors.password" hint="At least 8 characters" required>
      <CoarPasswordInput v-model="form.password" required />
    </CoarFormField>

    <CoarFormField label="Role" :error="errors.role" required>
      <CoarSelect v-model="form.role" :options="roles" placeholder="Select a role..." />
    </CoarFormField>

    <CoarFormField label="Department">
      <CoarSelect v-model="form.department" :options="departments" placeholder="Optional..." />
    </CoarFormField>

    <CoarFormField :error="errors.terms">
      <CoarCheckbox v-model="form.terms" label="I agree to the terms and conditions" />
    </CoarFormField>

    <div class="demo-form__actions">
      <CoarButton type="submit" :disabled="!isValid">Create Account</CoarButton>
    </div>

    <CoarNote v-if="submitted" variant="success" padding="s">
      Account created successfully!
    </CoarNote>
  </form>
</template>

<script setup lang="ts">
import { reactive, ref, computed } from 'vue';
import { CoarFormField, CoarTextInput, CoarPasswordInput, CoarSelect, CoarCheckbox, CoarButton, CoarNote } from '@cocoar/vue-ui';
import type { CoarSelectOption } from '@cocoar/vue-ui';

const form = reactive({
  name: '',
  email: '',
  password: '',
  role: null as string | null,
  department: null as string | null,
  terms: false,
});

const submitted = ref(false);
const touched = ref(false);

const roles: CoarSelectOption<string>[] = [
  { value: 'developer', label: 'Developer' },
  { value: 'designer', label: 'Designer' },
  { value: 'manager', label: 'Manager' },
  { value: 'qa', label: 'QA Engineer' },
];

const departments: CoarSelectOption<string>[] = [
  { value: 'engineering', label: 'Engineering' },
  { value: 'product', label: 'Product' },
  { value: 'marketing', label: 'Marketing' },
];

const errors = computed(() => {
  if (!touched.value) return { name: '', email: '', password: '', role: '', terms: '' };
  return {
    name: form.name.length === 0 ? 'Name is required' : '',
    email: form.email.length === 0 ? 'Email is required' : !form.email.includes('@') ? 'Enter a valid email' : '',
    password: form.password.length === 0 ? 'Password is required' : form.password.length < 8 ? 'At least 8 characters' : '',
    role: !form.role ? 'Please select a role' : '',
    terms: !form.terms ? 'You must accept the terms' : '',
  };
});

const isValid = computed(() =>
  form.name.length > 0 &&
  form.email.includes('@') &&
  form.password.length >= 8 &&
  form.role !== null &&
  form.terms
);

function onSubmit() {
  touched.value = true;
  if (isValid.value) {
    submitted.value = true;
  }
}
</script>

<style scoped>
.demo-form {
  display: flex;
  flex-direction: column;
  gap: var(--coar-spacing-m);
  max-width: 400px;
}
.demo-form__actions {
  padding-top: var(--coar-spacing-s);
}
</style>
