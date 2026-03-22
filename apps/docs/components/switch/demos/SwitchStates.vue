<template>
  <div style="display: flex; flex-direction: column; gap: 8px;">
    <CoarSwitch :model-value="true" label="Disabled (on)" :disabled="true" />
    <CoarSwitch :model-value="false" label="Disabled (off)" :disabled="true" />
    <CoarSwitch :model-value="false" label="Required switch" :required="true" />
    <CoarFormField error="This setting must be enabled">
      <CoarSwitch :model-value="false" label="With error" />
    </CoarFormField>
  </div>
</template>

<script setup lang="ts">
import { CoarSwitch, CoarFormField } from '@cocoar/vue-ui';
</script>
