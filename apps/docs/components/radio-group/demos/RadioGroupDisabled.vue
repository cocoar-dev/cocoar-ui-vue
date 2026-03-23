<template>
  <div>
    <CoarRadioGroup v-model="plan" name="plan" label="Plan">
      <CoarRadioButton value="free">Free</CoarRadioButton>
      <CoarRadioButton value="pro">Pro</CoarRadioButton>
      <CoarRadioButton value="enterprise" :disabled="true">Enterprise (Coming Soon)</CoarRadioButton>
    </CoarRadioGroup>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarRadioGroup, CoarRadioButton } from '@cocoar/vue-ui';

const plan = ref('free');
</script>
