<template>
  <div style="display: grid; gap: 4px; max-width: 480px;">
    <div style="display: grid; grid-template-columns: 120px 1fr; align-items: center;">
      <span>User</span>
      <CoarTextInput v-model="user" appearance="inline" />
    </div>
    <div style="display: grid; grid-template-columns: 120px 1fr; align-items: center;">
      <span>Password</span>
      <CoarPasswordInput v-model="password" appearance="inline" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarPasswordInput, CoarTextInput } from '@cocoar/vue-ui';

const user = ref('service-account');
const password = ref('secret-value');
</script>
