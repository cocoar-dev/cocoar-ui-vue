<script setup lang="ts">
/*
 * DRAFT — move to apps/playground/src/visual/stories/compact-page-builder.vue
 * only after vite.visual.config.ts (guarded harness, maintainer OK required)
 * aliases @cocoar/vue-page-builder and @cocoar/vue-script-editor to their
 * sources. Without them the visual page cannot resolve the package (its dist
 * is not built in the container) and the story fails to load.
 *
 * The real builder with a fixed schema (profile-neutral: the gallery or a story wrapper
 * sets `.coar-compact` on an ancestor):
 * structure drawer open, an element selected (inspector filled), canvas with a
 * container, leaf previews and an empty container (drop-zone placeholder).
 * Nothing random, no clock, no network; Monaco is only loaded by the Logic tab
 * and the code dialogs, which this story does not open.
 */
import { onMounted, ref } from 'vue';
import { CoarPageBuilder, type PageConfig, type PageNode } from '@cocoar/vue-page-builder';

const schema = ref<PageNode>({
  id: 'root',
  type: 'page',
  schemaVersion: 5,
  style: { gap: '16px', padding: '24px' },
  children: [
    { id: 'heading-welcome', type: 'heading', props: { text: 'Kontoeinstellungen', level: 2 } },
    {
      id: 'stack-form',
      type: 'stack',
      props: { direction: 'column' },
      style: { gap: '12px' },
      children: [
        { id: 'paragraph-intro', type: 'paragraph', props: { text: 'Änderungen gelten für alle Arbeitsbereiche.' } },
        { id: 'text-name', type: 'text-input', name: 'displayName', props: { label: 'Anzeigename', placeholder: 'Vor- und Nachname' } },
        { id: 'checkbox-news', type: 'checkbox', name: 'newsletter', props: { label: 'Benachrichtigungen per E-Mail' } },
        { id: 'button-save', type: 'button', props: { label: 'Speichern', variant: 'primary', action: 'demo:submit' } },
      ],
    },
    { id: 'card-empty', type: 'card', props: {}, children: [] },
  ],
} as PageNode);

const config: PageConfig = {
  allowedElements: ['stack', 'card', 'heading', 'paragraph', 'text-input', 'checkbox', 'button'],
  availableActions: [{ id: 'demo:submit', label: 'Submit (demo)' }],
};

const root = ref<HTMLElement | null>(null);

onMounted(() => {
  // Open the structure drawer and select a field, as an author would.
  root.value?.querySelector<HTMLButtonElement>('[aria-label="Structure"]')?.click();
  requestAnimationFrame(() => {
    const rows = [...(root.value?.querySelectorAll<HTMLElement>('.pb-tree-row') ?? [])];
    rows.find((row) => row.textContent?.includes('displayName'))?.click();
  });
});
</script>

<template>
  <section ref="root" class="vs-section" style="height: 720px">
    <CoarPageBuilder v-model="schema" :config="config" />
  </section>
</template>
