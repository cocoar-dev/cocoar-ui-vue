<template>
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <CoarRadioGroup :model-value="'a'" name="required-group" label="Required Group" :required="true">
      <CoarRadioButton value="a">Option A</CoarRadioButton>
      <CoarRadioButton value="b">Option B</CoarRadioButton>
    </CoarRadioGroup>
    <CoarFormField error="Please select an option">
      <CoarRadioGroup :model-value="''" name="with-error" label="With Error">
        <CoarRadioButton value="a">Option A</CoarRadioButton>
        <CoarRadioButton value="b">Option B</CoarRadioButton>
      </CoarRadioGroup>
    </CoarFormField>
  </div>
</template>

<script setup lang="ts">
import { CoarRadioGroup, CoarRadioButton, CoarFormField } from '@cocoar/vue-ui';
</script>
