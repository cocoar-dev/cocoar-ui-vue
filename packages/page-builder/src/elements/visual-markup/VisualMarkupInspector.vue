<script setup lang="ts">
import { computed, inject } from 'vue';
import { CoarFormField, CoarNotice } from '@cocoar/vue-ui';
import { CoarScriptEditor } from '@cocoar/vue-script-editor';
import type { VisualMarkupNode } from '../../schema';
import { BUILDER_CONFIG } from '../../builder/builderContext';
import { buildVisualDocument } from './visualDocument';

const props = defineProps<{
  node: VisualMarkupNode
  patch: (update: Partial<Omit<VisualMarkupNode, 'props'>> & { props?: Partial<VisualMarkupNode['props']> }) => void
}>();
const config = inject(BUILDER_CONFIG);
const result = computed(() => buildVisualDocument(
  props.node.props.html ?? '',
  props.node.props.css ?? '',
  config?.value?.visualMarkup,
));
</script>

<template>
  <CoarNotice v-if="!result.ok" variant="error">
    <ul class="pb-visual-errors"><li v-for="error in result.errors" :key="error">{{ error }}</li></ul>
  </CoarNotice>
  <CoarFormField label="Decorative HTML / inline SVG" hint="Scripts, links, forms, event handlers and external resources are rejected.">
    <CoarScriptEditor
      language="html"
      :model-value="node.props.html ?? ''"
      height="240px"
      :minimap="false"
      @update:model-value="(value) => patch({ props: { html: value } })"
    />
  </CoarFormField>
  <CoarFormField label="Iframe-local CSS" hint="Supports keyframes, media queries, custom properties and reduced motion.">
    <CoarScriptEditor
      language="css"
      :model-value="node.props.css ?? ''"
      height="240px"
      :minimap="false"
      @update:model-value="(value) => patch({ props: { css: value } })"
    />
  </CoarFormField>
</template>

<style scoped>
.pb-visual-errors { margin: 0; padding-left: 18px; }
</style>
