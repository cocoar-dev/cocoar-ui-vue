<template>
  <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
    <CoarButton icon-start="plus">Add Item</CoarButton>
    <CoarButton variant="secondary" icon-end="chevron-right">Next</CoarButton>
    <CoarButton variant="tertiary" icon-start="clipboard">Download</CoarButton>
    <CoarButton variant="danger" icon-start="trash-2">Delete</CoarButton>
  </div>
</template>

<script setup lang="ts">
import { CoarButton } from '@cocoar/vue-ui';
</script>
