<template>
  <div style="display: flex; flex-wrap: wrap; gap: 16px; align-items: center;">
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 13px; color: #64748b; min-width: 100px;">With start icon:</span>
      <CoarButton icon-start="check" :loading="isLoading" @click="simulateLoading">Save Changes</CoarButton>
    </div>
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 13px; color: #64748b; min-width: 100px;">Icon end:</span>
      <CoarButton icon-end="chevron-right" :loading="isLoadingEnd" @click="simulateLoadingEnd">Continue</CoarButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarButton } from '@cocoar/vue-ui';

const isLoading = ref(false);
const isLoadingEnd = ref(false);

function simulateLoading() {
  isLoading.value = true;
  setTimeout(() => { isLoading.value = false; }, 2000);
}

function simulateLoadingEnd() {
  isLoadingEnd.value = true;
  setTimeout(() => { isLoadingEnd.value = false; }, 2000);
}
</script>
