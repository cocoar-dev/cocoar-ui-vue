<script setup lang="ts">
import { computed } from 'vue';
import type { VisualMarkupNode } from '../../schema';
import { buildVisualDocument } from './visualDocument';

const props = defineProps<{ node: VisualMarkupNode }>();
const document = computed(() => buildVisualDocument(props.node.props.html ?? '', props.node.props.css ?? ''));
</script>

<template>
  <div class="pb-visual-preview">
    <iframe v-if="document.ok" :srcdoc="document.srcdoc" sandbox="" aria-hidden="true" tabindex="-1" />
    <span v-else>Invalid visual markup</span>
  </div>
</template>

<style scoped>
.pb-visual-preview { width: 100%; aspect-ratio: 16 / 9; overflow: hidden; border-radius: 4px; background: #f7f7f9; }
.pb-visual-preview iframe { display: block; width: 100%; height: 100%; border: 0; pointer-events: none; }
.pb-visual-preview span { display: grid; min-height: 80px; place-items: center; color: #991b1b; font-size: 12px; }
</style>
