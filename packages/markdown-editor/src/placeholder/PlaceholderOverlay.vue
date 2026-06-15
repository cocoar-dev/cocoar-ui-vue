<script setup lang="ts">
/**
 * Empty-state placeholder overlay.
 *
 * Renders the placeholder string through the **same** shared markdown viewer
 * the editor uses for its content (`@cocoar/vue-markdown`), so the hint can be
 * real Markdown — bold, lists, headings — and looks consistent with what the
 * user will type. It is a muted, non-interactive overlay (`pointer-events:
 * none`, `aria-hidden`) painted over the writing area only while the document
 * is empty. Crucially it is *not* document content: an untouched editor still
 * serialises to an empty string, so consumers never persist the hint.
 *
 * Positioning + muting live in `CoarMarkdownEditor.vue`'s stylesheet
 * (`.coar-md-placeholder`) next to the rest of the editor chrome.
 */
import { computed } from 'vue';
import { parse } from '@cocoar/vue-markdown-core';
import { CoarMarkdown } from '@cocoar/vue-markdown';

const props = defineProps<{ source: string }>();

// Parse once per source change. The viewer walks the resulting document with
// the default renderer registry (no app-level provide needed).
const doc = computed(() => parse(props.source));
</script>

<template>
  <div class="coar-md-placeholder" aria-hidden="true">
    <CoarMarkdown :doc="doc" />
  </div>
</template>
