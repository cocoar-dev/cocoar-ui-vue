<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px;">
    <CoarFormField label="Email" hint="Required field" required>
      <CoarTextInput
        v-model="email"
        placeholder="your@email.com"
        :required="true"
      />
    </CoarFormField>
    <CoarFormField label="Email" error="Please enter a valid email address">
      <CoarTextInput
        value="invalid-email"
      />
    </CoarFormField>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarTextInput, CoarFormField } from '@cocoar/vue-ui';

const email = ref('');
</script>
