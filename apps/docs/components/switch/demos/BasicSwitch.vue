<template>
  <div style="display: flex; flex-direction: column; gap: 12px;">
    <CoarSwitch v-model="darkMode" label="Dark mode" />
    <span style="font-size: 13px; color: #64748b;">Value: {{ darkMode }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarSwitch } from '@cocoar/vue-ui';

const darkMode = ref(false);
</script>
