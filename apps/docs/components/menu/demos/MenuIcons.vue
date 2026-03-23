<template>
  <CoarMenu>
    <CoarMenuItem icon="plus">New File</CoarMenuItem>
    <CoarMenuItem icon="copy">Duplicate</CoarMenuItem>
    <CoarMenuItem icon="clipboard">Paste</CoarMenuItem>
    <CoarMenuDivider />
    <CoarMenuItem icon="settings">Settings</CoarMenuItem>
    <CoarMenuItem icon="trash-2">Delete</CoarMenuItem>
  </CoarMenu>
</template>

<script setup lang="ts">
import { CoarMenu, CoarMenuItem, CoarMenuDivider } from '@cocoar/vue-ui';
</script>
