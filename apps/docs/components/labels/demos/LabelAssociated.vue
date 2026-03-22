<template>
  <div style="display: flex; flex-direction: column; gap: 4px; max-width: 320px;">
    <CoarLabel for="demo-input" text="Custom input" :required="true" hint="Enter anything" />
    <input
      id="demo-input"
      type="text"
      placeholder="Associated input"
      style="width: 100%; padding: 6px 10px; border: 1px solid var(--coar-border-neutral-secondary); border-radius: 6px; font-size: 14px; box-sizing: border-box;"
    />
  </div>
</template>

<script setup lang="ts">
import { CoarLabel } from '@cocoar/vue-ui';
</script>
