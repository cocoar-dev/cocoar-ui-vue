<script setup lang="ts">
import { provide, ref, shallowRef } from 'vue';
import {
  MARKDOWN_EDITOR_GROUP_KEY,
  type MarkdownEditorGroupContext,
  type MarkdownEditorGroupToolbarPosition,
  type MarkdownEditorToolbarController,
} from './editor-group';

const position = ref<MarkdownEditorGroupToolbarPosition>('top');
const activeId = ref<string | null>(null);
const activeController = shallowRef<MarkdownEditorToolbarController | null>(null);
const registered: MarkdownEditorToolbarController[] = [];

function activate(id: string): void {
  const controller = registered.find((entry) => entry.id === id);
  if (!controller) return;
  activeId.value = id;
  activeController.value = controller;
}

function deactivate(id: string): void {
  if (activeId.value === id) activeId.value = null;
}

function register(controller: MarkdownEditorToolbarController): () => void {
  if (!registered.some((entry) => entry.id === controller.id)) registered.push(controller);
  if (activeController.value === null) activeController.value = controller;
  return () => {
    const index = registered.findIndex((entry) => entry.id === controller.id);
    if (index >= 0) registered.splice(index, 1);
    if (activeId.value === controller.id) activeId.value = null;
    if (activeController.value?.id === controller.id) activeController.value = registered[0] ?? null;
  };
}

provide<MarkdownEditorGroupContext>(MARKDOWN_EDITOR_GROUP_KEY, {
  position,
  activeId,
  activeController,
  register,
  activate,
  deactivate,
});
</script>

<template>
  <slot />
</template>
