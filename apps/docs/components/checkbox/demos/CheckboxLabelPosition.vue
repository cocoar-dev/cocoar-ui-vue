<template>
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <CoarCheckbox v-model="a" label="Label after (default)" label-position="after" />
    <CoarCheckbox v-model="b" label="Label before" label-position="before" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarCheckbox } from '@cocoar/vue-ui';

const a = ref(true);
const b = ref(true);
</script>
