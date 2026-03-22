<template>
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <CoarRadioGroup :model-value="'a'" label="Required Group" :required="true">
      <CoarRadioButton value="a">Option A</CoarRadioButton>
      <CoarRadioButton value="b">Option B</CoarRadioButton>
    </CoarRadioGroup>
    <CoarFormField error="Please select an option">
      <CoarRadioGroup :model-value="''" label="With Error">
        <CoarRadioButton value="a">Option A</CoarRadioButton>
        <CoarRadioButton value="b">Option B</CoarRadioButton>
      </CoarRadioGroup>
    </CoarFormField>
  </div>
</template>

<script setup lang="ts">
import { CoarRadioGroup, CoarRadioButton, CoarFormField } from '@cocoar/vue-ui';
</script>
