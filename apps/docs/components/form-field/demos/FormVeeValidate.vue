<template>
  <form class="demo-form" @submit="onSubmit">
    <CoarFormField label="Email" :error="emailError" required>
      <CoarTextInput v-model="email" placeholder="jane@example.com" required />
    </CoarFormField>

    <CoarFormField label="Password" :error="passwordError" hint="At least 8 characters" required>
      <CoarPasswordInput v-model="password" required />
    </CoarFormField>

    <CoarFormField label="Confirm Password" :error="confirmError" required>
      <CoarPasswordInput v-model="confirm" required />
    </CoarFormField>

    <CoarFormField :error="termsError">
      <CoarCheckbox v-model="terms" label="I accept the terms of service" />
    </CoarFormField>

    <div class="demo-form__actions">
      <CoarButton type="submit">Sign Up</CoarButton>
    </div>

    <CoarNote v-if="submitted" variant="success" padding="s">
      Form submitted successfully!
    </CoarNote>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useForm, useField } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import { z } from 'zod';
import { CoarFormField, CoarTextInput, CoarPasswordInput, CoarCheckbox, CoarButton, CoarNote } from '@cocoar/vue-ui';

const schema = toTypedSchema(
  z.object({
    email: z.string().min(1, 'Email is required').email('Enter a valid email'),
    password: z.string().min(8, 'At least 8 characters'),
    confirm: z.string().min(1, 'Please confirm your password'),
    terms: z.literal(true, { errorMap: () => ({ message: 'You must accept the terms' }) }),
  }).refine((data) => data.password === data.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  }),
);

const submitted = ref(false);

const { handleSubmit } = useForm({ validationSchema: schema });

const { value: email, errorMessage: emailError } = useField<string>('email', undefined, { initialValue: '' });
const { value: password, errorMessage: passwordError } = useField<string>('password', undefined, { initialValue: '' });
const { value: confirm, errorMessage: confirmError } = useField<string>('confirm', undefined, { initialValue: '' });
const { value: terms, errorMessage: termsError } = useField<boolean>('terms', undefined, { initialValue: false });

const onSubmit = handleSubmit(() => {
  submitted.value = true;
});
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
