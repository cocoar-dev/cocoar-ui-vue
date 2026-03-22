<template>
  <div style="display: flex; flex-direction: column; gap: 8px;">
    <CoarCheckbox v-model="required" label="Required checkbox" :required="true" />
    <CoarCheckbox :model-value="true" label="Disabled (checked)" :disabled="true" />
    <CoarCheckbox :model-value="false" label="Disabled (unchecked)" :disabled="true" />
    <CoarCheckbox :model-value="false" label="With error" error="This field is required" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarCheckbox } from '@cocoar/vue-ui';

const required = ref(false);
</script>
