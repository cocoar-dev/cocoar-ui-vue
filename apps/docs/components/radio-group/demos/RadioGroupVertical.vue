<template>
  <div style="display: flex; flex-direction: column; gap: 12px;">
    <CoarRadioGroup v-model="color" label="Preferred Color" orientation="vertical">
      <CoarRadioButton value="red">Red — Passionate and energetic</CoarRadioButton>
      <CoarRadioButton value="blue">Blue — Calm and trustworthy</CoarRadioButton>
      <CoarRadioButton value="green">Green — Fresh and natural</CoarRadioButton>
      <CoarRadioButton value="purple">Purple — Creative and luxurious</CoarRadioButton>
    </CoarRadioGroup>
    <span style="font-size: 13px; color: #64748b;">Selected: {{ color || 'none' }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarRadioGroup, CoarRadioButton } from '@cocoar/vue-ui';

const color = ref('');
</script>
