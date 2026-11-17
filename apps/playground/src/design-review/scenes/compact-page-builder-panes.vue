<script setup lang="ts">
/*
 * Page builder · panes, profile-neutral, ONE DOCUMENT PER PROFILE (`isolation: 'frame'`):
 * Library drawer, Logic (Monaco), Translations, Compositions (real in-memory repository),
 * JSON and Preview (real CoarPageRenderer in the preview frame), plus the expression dialog
 * opened through an fx binding (Monaco, teleported). Monaco keeps one theme per document, so
 * legacy and compact must not share a page.
 *
 * `preview-locale` is set, so the Preview tab renders the page; compact-page-builder-code.vue
 * leaves it out to show the "Preview values are missing" state.
 */
import { onMounted, ref } from 'vue';
import { CoarPageBuilder, type PageNode } from '@cocoar/vue-page-builder';
import {
  createReviewCompositionRepository,
  createReviewConfig,
  createReviewSchema,
  openStructureDrawer,
} from './compact-page-builder-fixtures';

const schema = ref<PageNode>(createReviewSchema());
const config = createReviewConfig();
const repository = createReviewCompositionRepository();
const root = ref<HTMLElement | null>(null);

onMounted(() => openStructureDrawer(root.value));
</script>

<template>
  <section ref="root" class="vs-section" data-scene-part="builder" style="height: 760px">
    <CoarPageBuilder
      v-model="schema"
      :config="config"
      :composition-repository="repository"
      preview-locale="en"
    />
  </section>
</template>
