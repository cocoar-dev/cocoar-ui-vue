<script setup lang="ts">
import './compact-fonts';
import { onBeforeUnmount } from 'vue';
import BuilderEditorsScene from './builder-editors/BuilderEditorsScene.vue';

// Monaco themes are document-global. Give this new story a real compact document,
// without changing the visual page's html class contract or existing stories.
const alreadyCompact = document.body.classList.contains('coar-compact');
document.body.classList.add('coar-compact');
onBeforeUnmount(() => {
  if (!alreadyCompact) document.body.classList.remove('coar-compact');
});
</script>

<template>
  <div class="coar-compact">
    <BuilderEditorsScene />
  </div>
</template>
