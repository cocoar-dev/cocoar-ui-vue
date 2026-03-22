<template>
  <div style="display: flex; flex-direction: column; gap: 8px;">
    <CoarLabel text="Small label" size="s" :required="true" />
    <CoarLabel text="Medium label (default)" size="m" :required="true" />
    <CoarLabel text="Large label" size="l" :required="true" />
  </div>
</template>

<script setup lang="ts">
import { CoarLabel } from '@cocoar/vue-ui';
</script>
