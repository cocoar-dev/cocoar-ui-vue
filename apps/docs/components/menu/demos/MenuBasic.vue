<template>
  <div>
    <CoarMenu>
      <CoarMenuItem @click="handleClick('New File')">New File</CoarMenuItem>
      <CoarMenuItem @click="handleClick('Open...')">Open...</CoarMenuItem>
      <CoarMenuDivider />
      <CoarMenuItem @click="handleClick('Save')">Save</CoarMenuItem>
      <CoarMenuItem @click="handleClick('Save As...')">Save As...</CoarMenuItem>
      <CoarMenuDivider />
      <CoarMenuItem :disabled="true">Export (disabled)</CoarMenuItem>
    </CoarMenu>
    <p style="margin-top: 8px; font-size: 13px; color: var(--coar-text-neutral-secondary);">Last clicked: {{ lastClicked || 'none' }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarMenu, CoarMenuItem, CoarMenuDivider } from '@cocoar/vue-ui';

const lastClicked = ref('');

function handleClick(item: string) {
  lastClicked.value = item;
}
</script>
