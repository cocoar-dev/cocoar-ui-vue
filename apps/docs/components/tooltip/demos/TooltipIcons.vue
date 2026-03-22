<template>
  <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
    <CoarButton variant="ghost" icon-start="plus" v-tooltip="'Add new item'" aria-label="Add new item" />
    <CoarButton variant="ghost" icon-start="copy" v-tooltip="'Copy to clipboard'" aria-label="Copy" />
    <CoarButton variant="ghost" icon-start="trash-2" v-tooltip="'Delete selected'" aria-label="Delete" />
    <CoarButton variant="ghost" icon-start="settings" v-tooltip="'Open settings'" aria-label="Settings" />
  </div>
</template>

<script setup lang="ts">
import { CoarButton, vTooltip } from '@cocoar/vue-ui';
</script>
