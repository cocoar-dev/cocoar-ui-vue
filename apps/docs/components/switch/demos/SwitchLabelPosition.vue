<template>
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <CoarSwitch v-model="a" label="Label after (default)" label-position="after" />
    <CoarSwitch v-model="b" label="Label before" label-position="before" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarSwitch } from '@cocoar/vue-ui';

const a = ref(true);
const b = ref(true);
</script>
