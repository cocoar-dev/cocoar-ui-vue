<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px;">
    <CoarPasswordInput :model-value="'secret123'" label="Disabled" :disabled="true" />
    <CoarPasswordInput :model-value="'readonly-pass'" label="Readonly" :readonly="true" />
  </div>
</template>

<script setup lang="ts">
import { CoarPasswordInput } from '@cocoar/vue-ui';
</script>
