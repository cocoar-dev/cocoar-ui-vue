<script setup lang="ts">
/*
 * Page builder · code-driven authoring (`authoring-mode="code"`), one document per profile
 * (Monaco is document-global). The inspector shows "Add Page Code" for the page root and
 * "Add element code" for an element; both open the teleported Monaco dialogs.
 *
 * `preview-locale` is deliberately NOT set while `config.locales` is: the Preview tab then
 * shows its "Preview values are missing" empty state.
 */
import { onMounted, ref } from 'vue';
import { CoarPageBuilder, type PageNode } from '@cocoar/vue-page-builder';
import { createReviewConfig, createReviewSchema, openStructureDrawer } from './compact-page-builder-fixtures';

const schema = ref<PageNode>(createReviewSchema());
const config = createReviewConfig();
const root = ref<HTMLElement | null>(null);

onMounted(() => openStructureDrawer(root.value));
</script>

<template>
  <section ref="root" class="vs-section" data-scene-part="builder" style="height: 760px">
    <CoarPageBuilder v-model="schema" :config="config" authoring-mode="code" />
  </section>
</template>
