<script setup lang="ts">
import { computed, watch } from 'vue';
import type { VisualMarkupNode } from '../../schema';
import { usePageElement } from '../usePageElement';
import { buildVisualDocument } from './visualDocument';

const props = defineProps<{ node: VisualMarkupNode }>();
const ctx = usePageElement();
const document = computed(() => buildVisualDocument(
  props.node.props.html ?? '',
  props.node.props.css ?? '',
  ctx.config?.visualMarkup,
));
let warned = false;
watch(document, (result) => {
  if (result.ok || warned) return;
  warned = true;
  console.warn(`[CoarPageRenderer] visual-markup "${props.node.name ?? props.node.id}" was hidden:`, result.errors);
}, { immediate: true });
</script>

<template>
  <div class="pb-visual-markup" :data-visual-invalid="document.ok ? undefined : 'true'">
    <iframe
      v-if="document.ok"
      class="pb-visual-markup__frame"
      :srcdoc="document.srcdoc"
      sandbox=""
      aria-hidden="true"
      tabindex="-1"
      referrerpolicy="no-referrer"
      loading="eager"
    />
  </div>
</template>

<style scoped>
.pb-visual-markup {
  width: 100%;
  min-width: 0;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  pointer-events: none;
}
.pb-visual-markup__frame {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
  pointer-events: none;
}
</style>
