<template>
  <div style="display: flex; flex-direction: column; gap: 8px;">
    <CoarSwitch :model-value="true" label="Disabled (on)" :disabled="true" />
    <CoarSwitch :model-value="false" label="Disabled (off)" :disabled="true" />
    <CoarSwitch :model-value="false" label="Required switch" :required="true" />
    <CoarSwitch :model-value="false" label="With error" error="This setting must be enabled" />
  </div>
</template>

<script setup lang="ts">
import { CoarSwitch } from '@cocoar/vue-ui';
</script>
