<script setup lang="ts">
import type { MarkdownNode } from '@cocoar/vue-markdown-core';
import { linkUrl, linkHref, linkTarget, linkRel, imageSrc, imageAlt, imageTitle } from './helpers';

defineProps<{
  nodes: readonly MarkdownNode[];
}>();
</script>

<template>
  <template v-for="node in nodes" :key="node.id">
    <template v-if="node.type === 'text'">{{ node.text ?? '' }}</template>

    <em v-else-if="node.type === 'emphasis'">
      <MarkdownInlineNode :nodes="node.children ?? []" />
    </em>

    <strong v-else-if="node.type === 'strong'">
      <MarkdownInlineNode :nodes="node.children ?? []" />
    </strong>

    <del v-else-if="node.type === 'strikethrough'">
      <MarkdownInlineNode :nodes="node.children ?? []" />
    </del>

    <code v-else-if="node.type === 'inlineCode'" class="coar-markdown-inline-code">{{
      node.text ?? ''
    }}</code>

    <br v-else-if="node.type === 'lineBreak'" />

    <template v-else-if="node.type === 'link'">
      <a
        v-if="linkHref(node)"
        class="coar-markdown-link"
        :href="linkHref(node)!"
        :target="linkTarget(node) ?? undefined"
        :rel="linkRel(node) ?? undefined"
      >
        <MarkdownInlineNode :nodes="node.children ?? []" />
      </a>
      <MarkdownInlineNode v-else :nodes="node.children ?? []" />
    </template>

    <template v-else-if="node.type === 'image'">
      <img
        v-if="imageSrc(node)"
        class="coar-markdown-image"
        :src="imageSrc(node)!"
        :alt="imageAlt(node)"
        :title="imageTitle(node) ?? undefined"
        loading="lazy"
      />
    </template>

    <span v-else class="coar-markdown-unsupported-inline">[unsupported]</span>
  </template>
</template>
