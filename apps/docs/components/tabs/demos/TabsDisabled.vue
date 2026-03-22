<template>
  <CoarTabGroup>
    <CoarTab id="active1">Active</CoarTab>
    <CoarTab id="disabled1" :disabled="true">Disabled</CoarTab>
    <CoarTab id="active2">Active</CoarTab>
    <CoarTab id="disabled2" :disabled="true">Disabled</CoarTab>
  </CoarTabGroup>
</template>

<script setup lang="ts">
import { CoarTabGroup, CoarTab } from '@cocoar/vue-ui';
</script>
