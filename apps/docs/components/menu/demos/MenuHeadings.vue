<template>
  <CoarMenu>
    <CoarMenuHeading>File</CoarMenuHeading>
    <CoarMenuItem>New</CoarMenuItem>
    <CoarMenuItem>Open</CoarMenuItem>
    <CoarMenuItem>Recent</CoarMenuItem>
    <CoarMenuDivider />
    <CoarMenuHeading>Edit</CoarMenuHeading>
    <CoarMenuItem>Cut</CoarMenuItem>
    <CoarMenuItem>Copy</CoarMenuItem>
    <CoarMenuItem>Paste</CoarMenuItem>
  </CoarMenu>
</template>

<script setup lang="ts">
import { CoarMenu, CoarMenuItem, CoarMenuDivider, CoarMenuHeading } from '@cocoar/vue-ui';
</script>
