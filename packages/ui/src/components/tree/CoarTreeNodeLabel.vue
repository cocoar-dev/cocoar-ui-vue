<script setup lang="ts">
/**
 * `<CoarTreeNodeLabel>` — drop-in row-label that swaps to an inline-edit
 * input while `<CoarTree :renamable>` has flagged this row for rename.
 *
 * Usage inside CoarTree's default slot:
 * ```vue
 * <CoarTree renamable @rename="onRename">
 *   <template #default="{ node }">
 *     <CoarIcon ... />
 *     <CoarTreeNodeLabel :label="node.name" />
 *     <button>…</button>
 *   </template>
 * </CoarTree>
 * ```
 *
 * The label picks up the rename machinery via `inject` — no explicit
 * `:renaming` / `:buffer` wiring from the consumer. Outside a `:renamable`
 * tree the component renders a plain `<span>{{ label }}</span>` and the
 * injected context defaults are inert.
 */
import { computed, nextTick, useTemplateRef, watch, inject } from 'vue';
import { COAR_TREE_RENAME_KEY, COAR_TREE_ROW_ID_KEY } from './tree-types';

defineProps<{
  /** What to render when not renaming — typically the node's name. */
  label: string;
}>();

const rowId = inject(COAR_TREE_ROW_ID_KEY, null);
const rename = inject(COAR_TREE_RENAME_KEY, null);

// Computed so Vue templated v-if re-evaluates when the underlying ref changes.
// Previously this was a plain function `isRenaming()` — Vue still tracks
// dependencies when a function reads refs in the template, but a computed is
// the canonical way and is easier to reason about.
const isRenaming = computed(
  () => rename != null && rowId != null && rename.renamingId.value === rowId,
);

const inputEl = useTemplateRef<HTMLInputElement>('inputEl');

// Auto-focus + select-all the moment we enter rename mode. Tracking by
// flipping isRenaming so the watcher fires both on enter and on exit.
if (rename && rowId) {
  watch(isRenaming, async (now) => {
    if (!now) return;
    await nextTick();
    inputEl.value?.focus();
    inputEl.value?.select();
  });
}
</script>

<template>
  <input
    v-if="isRenaming"
    ref="inputEl"
    v-model="rename.buffer.value"
    class="coar-tree-node-label__input"
    :data-rename-id="rowId"
    @click.stop
    @dblclick.stop
    @keydown.stop
    @keydown.enter.prevent="rename?.commit()"
    @keydown.escape.prevent="rename?.cancel()"
    @focus="rename?.onFocus()"
    @blur="rename?.onBlur()"
  />
  <span v-else class="coar-tree-node-label__text">{{ label }}</span>
</template>

<style scoped>
.coar-tree-node-label__text {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.coar-tree-node-label__input {
  flex: 1;
  min-width: 0;
  font: inherit;
  color: inherit;
  background: var(--coar-background-neutral-primary);
  border: 1px solid var(--coar-border-accent-primary);
  border-radius: var(--coar-radius-xs, 2px);
  padding: 1px 4px;
  margin: -2px 0;
  outline: none;
}
</style>
