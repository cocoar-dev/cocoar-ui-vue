<template>
  <div>
    <CoarCheckbox v-model="checked" :indeterminate="true" label="Select all (partial)" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarCheckbox } from '@cocoar/vue-ui';

const checked = ref(false);
</script>
