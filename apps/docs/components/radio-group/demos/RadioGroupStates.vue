<template>
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <CoarRadioGroup :model-value="'a'" label="Required Group" :required="true">
      <CoarRadioButton value="a">Option A</CoarRadioButton>
      <CoarRadioButton value="b">Option B</CoarRadioButton>
    </CoarRadioGroup>
    <CoarRadioGroup :model-value="''" label="With Error" error="Please select an option">
      <CoarRadioButton value="a">Option A</CoarRadioButton>
      <CoarRadioButton value="b">Option B</CoarRadioButton>
    </CoarRadioGroup>
  </div>
</template>

<script setup lang="ts">
import { CoarRadioGroup, CoarRadioButton } from '@cocoar/vue-ui';
</script>
