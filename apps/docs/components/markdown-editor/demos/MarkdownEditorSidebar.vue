<template>
  <ClientOnly>
    <div style="display: flex; flex-direction: column; gap: 12px;">
      <CoarSelect
        v-model="position"
        :options="positionOptions"
        label="toolbar-position"
        size="s"
        style="width: 200px;"
      />
      <div class="md-frame">
        <component
          :is="Editor"
          v-if="Editor"
          v-model="value"
          toolbar-mode="fixed"
          :toolbar-position="position"
        />
        <div v-else class="md-frame__loading">Loading editor…</div>
      </div>
    </div>
  </ClientOnly>
</template>

<script setup lang="ts">
import { onMounted, ref, shallowRef, type Component } from 'vue';
import { CoarSelect } from '@cocoar/vue-ui';
import type { CoarSelectOption } from '@cocoar/vue-ui';

type Position = 'left' | 'right' | 'top' | 'bottom';

const value = ref(`# Sidebar toolbar

Use the icon strip on any of the four edges for persistent access to formatting
commands. Hover **Headings** to open the flyout.
`);

const position = ref<Position>('left');

const positionOptions: CoarSelectOption<Position>[] = [
  { value: 'left', label: 'left' },
  { value: 'right', label: 'right' },
  { value: 'top', label: 'top' },
  { value: 'bottom', label: 'bottom' },
];

const Editor = shallowRef<Component | null>(null);

onMounted(async () => {
  const mod = await import('@cocoar/vue-markdown-editor');
  Editor.value = mod.CoarMarkdownEditor;
});
</script>

<style scoped>
.md-frame {
  height: 320px;
  border: 1px solid var(--coar-border-neutral);
  border-radius: var(--coar-radius-xl);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.md-frame__loading {
  padding: 24px;
  text-align: center;
  color: var(--coar-text-neutral-tertiary);
  font-size: 13px;
}
</style>
