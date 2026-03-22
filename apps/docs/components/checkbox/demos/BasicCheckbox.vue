<template>
  <div style="display: flex; flex-direction: column; gap: 12px;">
    <CoarCheckbox v-model="checked" label="Accept terms and conditions" />
    <span style="font-size: 13px; color: #64748b;">Checked: {{ checked }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarCheckbox } from '@cocoar/vue-ui';

const checked = ref(false);
</script>
