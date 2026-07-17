<template>
  <div class="renderer-demo">
    <CoarPageRenderer :schema="schema" :actions="actions" />
    <pre class="renderer-demo__result">{{ result }}</pre>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarPageRenderer, type ActionValues, type PageNode } from '@cocoar/vue-page-builder';

const result = ref(
  'Click "Sign in" with empty fields — the click marks every field touched and reveals all errors at once.',
);

const schema: PageNode = {
  id: 'root',
  type: 'page',
  style: { gap: '16px', padding: '24px', align: 'center' },
  children: [
    {
      id: 'card',
      type: 'card',
      props: {},
      style: { size: 'fixed', width: '360px', gap: '16px' },
      children: [
        { id: 'title', type: 'heading', props: { text: 'Welcome back', level: 3 } },
        {
          id: 'email',
          type: 'text-input',
          name: 'email',
          props: {
            label: 'Email',
            inputType: 'email',
            placeholder: 'you@example.com',
          },
          validation: { required: true },
        },
        {
          id: 'password',
          type: 'password-input',
          name: 'password',
          props: {
            label: 'Password',
          },
          validation: { required: true, minLength: 8 },
        },
        {
          id: 'remember',
          type: 'checkbox',
          name: 'rememberMe',
          props: { label: 'Remember me' },
          defaultValue: false,
        },
        {
          id: 'submit',
          type: 'button',
          props: {
            label: 'Sign in',
            action: 'auth:login',
            validates: true,
          },
          style: { size: 'fill' },
        },
      ],
    },
  ],
};

const actions = {
  'auth:login': (values: ActionValues) => {
    result.value = JSON.stringify(values, null, 2);
  },
};
</script>

<style scoped>
.renderer-demo__result {
  margin: 16px 0 0;
  padding: 12px 16px;
  border-radius: 8px;
  background: var(--coar-background-neutral-secondary, #f5f5f5);
  color: var(--coar-text-neutral-secondary, #666);
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
