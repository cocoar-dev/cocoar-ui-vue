<template>
  <div style="display: flex; flex-direction: column; gap: 12px;">
    <CoarRadioGroup v-model="size" label="Button Size">
      <CoarRadioButton value="xs">XS</CoarRadioButton>
      <CoarRadioButton value="s">S</CoarRadioButton>
      <CoarRadioButton value="m">M</CoarRadioButton>
      <CoarRadioButton value="l">L</CoarRadioButton>
    </CoarRadioGroup>
    <span style="font-size: 13px; color: #64748b;">Selected: {{ size }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarRadioGroup, CoarRadioButton } from '@cocoar/vue-ui';

const size = ref('m');
</script>
