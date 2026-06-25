<template>
  <div style="display: flex; flex-direction: column; gap: 8px;">
    <CoarSwitch :model-value="true" size="xs" label="Extra-small switch" />
    <CoarSwitch :model-value="true" size="s" label="Small switch" />
    <CoarSwitch :model-value="true" size="m" label="Medium switch (default)" />
    <CoarSwitch :model-value="true" size="l" label="Large switch" />
  </div>
</template>

<script setup lang="ts">
import { CoarSwitch } from '@cocoar/vue-ui';
</script>
