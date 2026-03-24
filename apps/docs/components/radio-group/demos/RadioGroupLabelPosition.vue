<template>
  <div style="display: flex; gap: 48px;">
    <CoarRadioGroup v-model="a" name="pos-after" label="Label after (default)">
      <CoarRadioButton value="email">Email</CoarRadioButton>
      <CoarRadioButton value="sms">SMS</CoarRadioButton>
      <CoarRadioButton value="push">Push</CoarRadioButton>
    </CoarRadioGroup>

    <CoarRadioGroup v-model="b" name="pos-before" label="Label before" label-position="before">
      <CoarRadioButton value="email">Email</CoarRadioButton>
      <CoarRadioButton value="sms">SMS</CoarRadioButton>
      <CoarRadioButton value="push">Push</CoarRadioButton>
    </CoarRadioGroup>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarRadioGroup, CoarRadioButton } from '@cocoar/vue-ui';

const a = ref('email');
const b = ref('email');
</script>
