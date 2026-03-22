<template>
  <div class="demo">
    <CoarButton @click="expanded = !expanded">
      {{ expanded ? 'Collapse' : 'Expand' }}
    </CoarButton>
    <CoarCollapse>
      <div v-if="expanded" class="demo-content">
        <CoarNote variant="neutral" padding="m">
          <p><strong>Expandable content</strong></p>
          <p>This section smoothly collapses and expands by animating the height. Useful for accordions, expandable panels, and progressive disclosure patterns.</p>
          <ul>
            <li>Animates actual height (not max-height hack)</li>
            <li>Works with dynamic content</li>
            <li>Respects prefers-reduced-motion</li>
          </ul>
        </CoarNote>
      </div>
    </CoarCollapse>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarCollapse, CoarButton, CoarNote } from '@cocoar/vue-ui';

const expanded = ref(false);
</script>

<style scoped>
.demo-content { margin-top: 12px; }
</style>
