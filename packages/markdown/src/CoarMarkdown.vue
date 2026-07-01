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
import { provide } from 'vue';
import type { MarkdownDocument } from '@cocoar/vue-markdown-core';
import { RenderNode } from './RenderNode';
import type { MarkdownViewerRenderers } from './registry';
import { MARKDOWN_EMBEDS_KEY, type EmbedRegistry } from './embeds';
import { MARKDOWN_FENCE_RENDERERS_KEY, type FenceRegistry } from './fences';

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
  /**
   * Custom-embed registry: maps a `:::key{props}` key to a Vue component.
   * Provided down to the `DefaultEmbed` renderer via inject. An app-wide
   * default can also be set with `app.provide(MARKDOWN_EMBEDS_KEY, ...)`.
   */
  embeds?: EmbedRegistry;
  /**
   * Fenced-code-block renderer registry: maps a fence language (e.g. `mermaid`)
   * to a Vue component that renders it richly instead of as a plain code block.
   * Provided down to `DefaultCodeBlock` via inject; an unregistered language
   * still renders as a normal code block. An app-wide default can also be set
   * with `app.provide(MARKDOWN_FENCE_RENDERERS_KEY, ...)`.
   */
  fenceRenderers?: FenceRegistry;
}

const props = defineProps<CoarMarkdownProps>();

// Make the embed + fence registries resolvable deep in the render tree.
// Registries are static in practice, so providing the initial value is enough.
if (props.embeds) {
  provide(MARKDOWN_EMBEDS_KEY, props.embeds);
}
if (props.fenceRenderers) {
  provide(MARKDOWN_FENCE_RENDERERS_KEY, props.fenceRenderers);
}
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
