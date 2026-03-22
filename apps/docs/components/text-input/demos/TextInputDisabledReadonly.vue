<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px;">
    <CoarFormField label="Disabled">
      <CoarTextInput value="Cannot edit" :disabled="true" />
    </CoarFormField>
    <CoarFormField label="Readonly">
      <CoarTextInput value="View only" :readonly="true" />
    </CoarFormField>
  </div>
</template>

<script setup lang="ts">
import { CoarTextInput, CoarFormField } from '@cocoar/vue-ui';
</script>
