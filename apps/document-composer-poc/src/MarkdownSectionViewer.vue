<script setup lang="ts">
import { computed } from 'vue';
import { CoarMarkdownEditor } from '@cocoar/vue-markdown-editor';
import { documentValueFor, updateDocumentValue } from './page-store';
import { markdownValueTools } from './markdown-value-tools';

const props = withDefaults(defineProps<{
  id: string
  label?: string
  placeholder?: string
}>(), {
  label: 'Editable text',
  placeholder: 'Click here to add text …',
});

const value = computed(() => documentValueFor(props.id));
</script>

<template>
  <section class="markdown-value-section" :data-value-id="id">
    <header>
      <span>{{ label }}</span>
      <small>Editable Markdown</small>
    </header>
    <div class="markdown-value-section__editor">
      <CoarMarkdownEditor
        :model-value="value"
        :placeholder="placeholder"
        :tools="markdownValueTools"
        toolbar-mode="external"
        toolbar-position="top"
        flavor="gfm"
        @update:model-value="updateDocumentValue(id, $event)"
      />
    </div>
  </section>
</template>

<style scoped>
.markdown-value-section {
  position: relative;
  min-height: 96px;
  margin: 10px 0 20px;
  border: 1px dashed #b9c7bc;
  border-radius: 4px 10px 4px 10px;
  background: #fbfcfa;
  transition: border-color 120ms ease, box-shadow 120ms ease, background 120ms ease;
}

.markdown-value-section:hover {
  border-color: #8fa593;
  background: #fff;
}

.markdown-value-section:focus-within {
  border-color: #55705a;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(85, 112, 90, .12);
}

.markdown-value-section header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 25px;
  padding: 5px 10px 4px;
  border-bottom: 1px solid #e4e9e5;
  color: #607066;
  font-size: 9px;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.markdown-value-section header span { font-weight: 750; }
.markdown-value-section header small { color: #8a948d; font-size: 8px; }
.markdown-value-section__editor { min-height: 68px; }
.markdown-value-section__editor :deep(.coar-md-root) { min-height: 68px; border: 0; }
.markdown-value-section__editor :deep(.coar-md-area .milkdown) { min-height: 68px; padding: 12px 14px 14px; }
</style>
