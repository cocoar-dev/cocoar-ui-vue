<template>
  <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
    <CoarTag
      v-for="tag in tags"
      :key="tag"
      variant="info"
      closable
      @closed="removeTag(tag)"
    >{{ tag }}</CoarTag>
    <span v-if="tags.length === 0" style="font-size: 14px; color: #94a3b8;">All tags removed</span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarTag } from '@cocoar/vue-ui';

const tags = ref(['Vue 3', 'TypeScript', 'Vite', 'Pinia', 'TailwindCSS']);

function removeTag(tag: string) {
  tags.value = tags.value.filter(t => t !== tag);
}
</script>
