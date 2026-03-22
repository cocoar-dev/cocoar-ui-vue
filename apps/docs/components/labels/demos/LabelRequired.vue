<template>
  <div style="display: flex; flex-direction: column; gap: 8px;">
    <CoarLabel text="First name" :required="true" />
    <CoarLabel text="Email" :required="true" />
    <CoarLabel text="Password" :required="true" />
  </div>
</template>

<script setup lang="ts">
import { CoarLabel } from '@cocoar/vue-ui';
</script>
