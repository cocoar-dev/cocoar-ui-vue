<script setup lang="ts">
import type { EmbedEditorProps } from '@cocoar/vue-markdown';

type MarkdownSectionAttrs = { id: string; label?: string; placeholder?: string };
defineProps<EmbedEditorProps<MarkdownSectionAttrs>>();
</script>

<template>
  <article class="markdown-section-reference">
    <div class="markdown-section-reference__mark" aria-hidden="true">M</div>
    <div>
      <span>Editable value slot · {{ controller.props.id }}</span>
      <strong>{{ controller.props.label || 'Editable text' }}</strong>
      <small>{{ controller.props.placeholder || 'Click here to add text …' }}</small>
    </div>
  </article>
</template>

<style scoped>
.markdown-section-reference {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  padding: 11px 13px;
  border: 1px dashed #9fb1a2;
  border-radius: 7px;
  background: #f7faf6;
  color: #27342b;
}
.markdown-section-reference__mark { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 8px 3px 8px 3px; background: #47697a; color: #fff; font-weight: 750; }
.markdown-section-reference > div:last-child { display: grid; gap: 1px; }
.markdown-section-reference span { color: #55705a; font-size: 9px; font-weight: 750; letter-spacing: .08em; text-transform: uppercase; }
.markdown-section-reference strong { font-size: 13px; }
.markdown-section-reference small { overflow: hidden; color: #768079; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
</style>
