<template>
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <CoarRadioGroup :model-value="'a'" name="size-s" label="Small" size="s">
      <CoarRadioButton value="a">Option A</CoarRadioButton>
      <CoarRadioButton value="b">Option B</CoarRadioButton>
    </CoarRadioGroup>
    <CoarRadioGroup :model-value="'a'" name="size-m" label="Medium (default)" size="m">
      <CoarRadioButton value="a">Option A</CoarRadioButton>
      <CoarRadioButton value="b">Option B</CoarRadioButton>
    </CoarRadioGroup>
    <CoarRadioGroup :model-value="'a'" name="size-l" label="Large" size="l">
      <CoarRadioButton value="a">Option A</CoarRadioButton>
      <CoarRadioButton value="b">Option B</CoarRadioButton>
    </CoarRadioGroup>
  </div>
</template>

<script setup lang="ts">
import { CoarRadioGroup, CoarRadioButton } from '@cocoar/vue-ui';
</script>
