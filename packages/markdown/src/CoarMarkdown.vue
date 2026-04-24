<script setup lang="ts">
/**
 * Markdown viewer.
 *
 * Walks the parsed `MarkdownDocument` and renders it through the shared
 * rendering registry exported from this same package. Output and styling
 * are identical to what `@cocoar/vue-markdown-editor` produces from the
 * same source — both consume the same registry + the same stylesheet.
 *
 * Override behaviour:
 * - `renderers` prop — per-instance override (e.g. swap the code block
 *   for a custom highlighter on this viewer only).
 * - `app.provide(MARKDOWN_RENDERERS_KEY, ...)` — app-wide override.
 * - Default: `defaultMarkdownRenderers` (Cocoar UI components).
 *
 * The shared CSS is imported via `<style>` here so consumers don't have to
 * remember a separate stylesheet import. Bundlers split it out into the
 * package's `dist/index.css`, also reachable via `@import
 * "@cocoar/vue-markdown/styles"`.
 */
import type { MarkdownDocument } from '@cocoar/vue-markdown-core';
import { RenderNode } from './RenderNode';
import type { MarkdownViewerRenderers } from './registry';

export interface CoarMarkdownProps {
  /** The parsed markdown document to render. */
  doc: MarkdownDocument;
  /**
   * Per-instance renderer override. When omitted the viewer uses the
   * `provide`d registry (if any) or the built-in Cocoar defaults.
   * Spread the defaults to override only specific node types:
   * `{ ...defaultMarkdownRenderers, codeBlock: MyCustomCodeBlock }`.
   */
  renderers?: MarkdownViewerRenderers;
}

defineProps<CoarMarkdownProps>();
</script>

<template>
  <div class="coar-markdown">
    <RenderNode
      v-for="node in doc.nodes"
      :key="node.id"
      :node="node"
      :renderers="renderers"
    />
  </div>
</template>

<style>
@import "../styles/markdown-blocks.css";
</style>
