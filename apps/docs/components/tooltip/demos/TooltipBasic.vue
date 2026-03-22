<template>
  <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
    <CoarButton v-tooltip="'Save your changes'">Save</CoarButton>
    <CoarButton variant="danger" v-tooltip="'This action cannot be undone'">Delete</CoarButton>
    <CoarButton variant="ghost" v-tooltip="'Cancel and go back'">Cancel</CoarButton>
  </div>
</template>

<script setup lang="ts">
import { CoarButton, vTooltip } from '@cocoar/vue-ui';
</script>
