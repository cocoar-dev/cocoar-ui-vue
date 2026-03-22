<template>
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px;">
    <CoarTextInput size="xs" label="Extra Small" placeholder="27px" />
    <CoarTextInput size="s" label="Small" placeholder="32px" />
    <CoarTextInput size="m" label="Medium" placeholder="40px" />
    <CoarTextInput size="l" label="Large" placeholder="48px" />
  </div>
</template>

<script setup lang="ts">
import { CoarTextInput } from '@cocoar/vue-ui';
</script>
