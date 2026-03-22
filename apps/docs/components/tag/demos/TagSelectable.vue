<template>
  <div>
    <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
      <CoarTag
        v-for="tech in options"
        :key="tech"
        :variant="activeTags.includes(tech) ? 'info' : 'neutral'"
        style="cursor: pointer;"
        @click="toggleTag(tech)"
      >{{ tech }}</CoarTag>
    </div>
    <p style="margin: 8px 0 0; font-size: 13px; color: #64748b;">Active: {{ activeTags.join(', ') || 'none' }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarTag } from '@cocoar/vue-ui';

const options = ['vue', 'typescript', 'vite', 'pinia'];
const activeTags = ref(['vue', 'typescript']);

function toggleTag(tag: string) {
  const i = activeTags.value.indexOf(tag);
  if (i >= 0) activeTags.value.splice(i, 1);
  else activeTags.value.push(tag);
}
</script>
