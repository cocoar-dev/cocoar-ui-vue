<script setup lang="ts">
/**
 * Recursive outline list — used by DocumentSidebar. Extracted into its own file
 * because TypeScript's flow analysis can't resolve a self-referential
 * `defineComponent` (the type of the variable depends on the type of its
 * render function, which depends on the variable). A separate component
 * has a stable identity that the template lookup resolves at runtime.
 */
import type { PropType } from 'vue';

export interface OutlineNode {
  title: string;
  dest: string | unknown[] | null;
  items: OutlineNode[];
  /** Resolved 0-based page index, memoised by the parent on first click. */
  resolvedPageIndex?: number;
}

defineProps({
  nodes: {
    type: Array as PropType<OutlineNode[]>,
    required: true,
  },
  depth: {
    type: Number,
    default: 0,
  },
});

defineEmits<{
  (e: 'jump', node: OutlineNode): void;
}>();
</script>

<template>
  <ul class="coar-pdf-sidebar__outline-list">
    <li
      v-for="(n, i) in nodes"
      :key="i"
      class="coar-pdf-sidebar__outline-item"
    >
      <button
        type="button"
        class="coar-pdf-sidebar__outline-link"
        :style="{ paddingLeft: `${8 + depth * 12}px` }"
        @click="$emit('jump', n)"
      >{{ n.title || '(untitled)' }}</button>
      <PdfOutlineList
        v-if="n.items && n.items.length > 0"
        :nodes="n.items"
        :depth="depth + 1"
        @jump="$emit('jump', $event)"
      />
    </li>
  </ul>
</template>
