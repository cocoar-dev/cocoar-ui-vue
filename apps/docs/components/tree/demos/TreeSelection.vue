<script setup lang="ts">
/**
 * The three selection modes. Toggle between single / multiple / checkbox and
 * watch the bound models update. In checkbox mode the checkbox set
 * (`checkedIds`) is independent of the highlight (`selectedIds`), and folder
 * checks cascade with a tri-state (indeterminate) parent.
 */
import { ref } from 'vue';
import { CoarTree, CoarIcon, CoarSegmentedControl, type CoarTreeSelectionMode } from '@cocoar/vue-ui';

interface Node {
  id: string;
  label: string;
  children?: Node[];
}

const tree: Node[] = [
  {
    id: 'src',
    label: 'src',
    children: [
      { id: 'src/main.ts', label: 'main.ts' },
      { id: 'src/app.vue', label: 'App.vue' },
      {
        id: 'src/components',
        label: 'components',
        children: [
          { id: 'src/components/button.vue', label: 'Button.vue' },
          { id: 'src/components/tree.vue', label: 'Tree.vue' },
        ],
      },
    ],
  },
  { id: 'readme', label: 'README.md' },
];

const mode = ref<CoarTreeSelectionMode>('checkbox');
const modeOptions = [
  { value: 'single', label: 'single' },
  { value: 'multiple', label: 'multiple' },
  { value: 'checkbox', label: 'checkbox' },
];

const expanded = ref(new Set<string>(['src', 'src/components']));
const selected = ref<string | null>(null);
const selectedIds = ref(new Set<string>());
const checkedIds = ref(new Set<string>());
</script>

<template>
  <div class="sel-demo">
    <CoarSegmentedControl v-model="mode" :options="modeOptions" size="s" />

    <div class="tree-frame">
      <CoarTree
        :nodes="tree"
        :get-id="(n: Node) => n.id"
        :get-children="(n: Node) => n.children"
        :get-label="(n: Node) => n.label"
        :selection-mode="mode"
        aria-label="Project files"
        v-model:expanded="expanded"
        v-model:selected="selected"
        v-model:selected-ids="selectedIds"
        v-model:checked-ids="checkedIds"
      >
        <template #default="{ node }">
          <CoarIcon :name="node.children ? 'folder' : 'file-text'" size="xs" class="sel-row__icon" />
          <span class="sel-row__label">{{ node.label }}</span>
        </template>
      </CoarTree>
    </div>

    <p class="sel-state">
      <template v-if="mode === 'single'">Selected: <code>{{ selected ?? '—' }}</code></template>
      <template v-else-if="mode === 'multiple'">Selected: <code>{{ [...selectedIds].join(', ') || '—' }}</code></template>
      <template v-else>Checked: <code>{{ [...checkedIds].join(', ') || '—' }}</code></template>
    </p>
  </div>
</template>

<style scoped>
.sel-demo {
  max-width: 380px;
}
.tree-frame {
  border: 1px solid var(--coar-border-neutral-secondary);
  border-radius: 8px;
  padding: 4px 0;
  margin-top: 10px;
}
.sel-row__icon {
  color: var(--coar-text-neutral-tertiary);
  flex-shrink: 0;
}
.sel-row__label {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sel-state {
  margin-top: 12px;
  font-size: 13px;
  color: var(--coar-text-neutral-secondary);
}
</style>
