<template>
  <div class="builder-playground">
    <CoarPageBuilder v-model="schema" :config="config" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarPageBuilder, type PageNode, type PageConfig } from '@cocoar/vue-page-builder';
import '@cocoar/vue-page-builder/styles';

const schema = ref<PageNode>({
  id: 'root',
  type: 'page',
  schemaVersion: 1,
  style: { gap: '16px', padding: '24px' },
  children: [
    {
      id: 'heading-welcome',
      type: 'heading',
      text: 'Welcome',
      level: 2,
    },
    {
      id: 'stack-intro',
      type: 'stack',
      direction: 'column',
      style: { gap: '12px' },
      children: [
        {
          id: 'paragraph-intro',
          type: 'paragraph',
          text: 'Drag elements from the palette onto the canvas, reorder rows in the outline via their grip handles, and press Ctrl+Z to undo.',
        },
      ],
    },
  ],
});

// Only these types show up in the palette and the outline's "Add child" menu —
// note that Section, Select, Link and Image are gated out.
const config: PageConfig = {
  allowedElements: ['stack', 'card', 'heading', 'paragraph', 'text-input', 'checkbox', 'button'],
  availableActions: [
    { id: 'demo:submit', label: 'Submit (demo)' },
  ],
};
</script>

<style scoped>
.builder-playground {
  height: 560px;
}
</style>
