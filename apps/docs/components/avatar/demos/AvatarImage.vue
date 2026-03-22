<template>
  <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center;">
    <CoarAvatar src="https://i.pravatar.cc/150?img=1" name="User One" />
    <CoarAvatar src="https://i.pravatar.cc/150?img=2" name="User Two" />
    <CoarAvatar src="https://i.pravatar.cc/150?img=3" name="User Three" />
    <CoarAvatar src="https://invalid-url.xyz/broken.jpg" name="Broken Image" />
  </div>
</template>

<script setup lang="ts">
import { CoarAvatar } from '@cocoar/vue-ui';
</script>
