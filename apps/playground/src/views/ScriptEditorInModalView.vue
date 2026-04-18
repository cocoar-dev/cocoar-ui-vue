<script setup lang="ts">
import { CoarButton, useDialog } from '@cocoar/vue-ui';
import EditorInModalContent from './EditorInModalContent.vue';

const dialog = useDialog();

function openEditorModal() {
  dialog.open(EditorInModalContent, {
    title: 'Script Editor inside a modal',
    size: 'l',
  });
}
</script>

<template>
  <div class="view">
    <h2>Monaco IntelliSense inside a modal</h2>
    <p>
      Open the modal, then place the cursor after <code>ctx.</code> and press
      <kbd>Ctrl+Space</kbd>. With Monaco's default widget positioning + an overlay-rendered
      modal, the IntelliSense popup tends to render in the wrong stacking context — either
      offscreen, anchored to the wrong parent, or behind the modal backdrop.
    </p>
    <p>
      This view exists to reproduce the problem so we can fix it in the editor component.
    </p>
    <CoarButton variant="primary" @click="openEditorModal">Open editor modal</CoarButton>
  </div>
</template>

<style scoped>
.view {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 720px;
}

.view code {
  background: var(--coar-background-neutral-tertiary, #f3f4f6);
  padding: 1px 6px;
  border-radius: 3px;
}
</style>
