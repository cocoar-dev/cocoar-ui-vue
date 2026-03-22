<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px;">
    <CoarTextInput label="Disabled" value="Cannot edit" :disabled="true" />
    <CoarTextInput label="Readonly" value="View only" :readonly="true" />
  </div>
</template>

<script setup lang="ts">
import { CoarTextInput } from '@cocoar/vue-ui';
</script>
