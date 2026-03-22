<template>
  <div style="display: flex; flex-direction: column; gap: 8px;">
    <CoarLabel text="Username" hint="3-20 characters, letters and numbers only" />
    <CoarLabel text="Password" :required="true" hint="Min 8 characters" />
  </div>
</template>

<script setup lang="ts">
import { CoarLabel } from '@cocoar/vue-ui';
</script>
