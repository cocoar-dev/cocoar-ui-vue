<script setup lang="ts">
/*
 * Page builder · element inspectors + standalone renderer, profile-neutral (the gallery or a
 * frame page puts `.coar-compact` / `.coar-mobile` on an ancestor).
 *
 * `builder`: the real CoarPageBuilder (properties mode) with every inspector the review
 * needs, selected by real clicks in the spec: stack, paragraph, image (with pickAsset),
 * button (action editor + fx), select (OptionsEditor), a button with an authoring warning
 * (issue icon on its outline row) and linked / empty cards.
 * `renderer`: the real CoarPageRenderer on a separate copy of the same document, outside
 * the builder: authored content, never themed by the chrome roles.
 *
 * No Monaco is loaded: nothing here opens Logic or a code dialog (see -panes.vue / -code.vue).
 */
import { onMounted, ref } from 'vue';
import { CoarPageBuilder, CoarPageRenderer, type PageNode } from '@cocoar/vue-page-builder';
import { createReviewConfig, createReviewSchema, openStructureDrawer } from './compact-page-builder-fixtures';

const schema = ref<PageNode>(createReviewSchema());
const rendered = createReviewSchema();
const config = createReviewConfig();
const builderRoot = ref<HTMLElement | null>(null);

onMounted(() => openStructureDrawer(builderRoot.value));
</script>

<template>
  <section ref="builderRoot" class="vs-section" data-scene-part="builder" style="height: 760px">
    <CoarPageBuilder v-model="schema" :config="config" preview-locale="en" />
  </section>
  <section class="vs-section" data-scene-part="renderer" style="max-width: 640px">
    <CoarPageRenderer :schema="rendered" :config="config" locale="en" />
  </section>
</template>
