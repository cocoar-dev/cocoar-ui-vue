<script setup lang="ts">
/**
 * The simplest possible `<CoarTree>`: a static nested structure rendered with
 * the default slot. Click a row to select it, click a chevron (or use Space)
 * to expand or collapse a branch.
 */
import { ref } from 'vue';
import { CoarTree, CoarIcon, vTooltip } from '@cocoar/vue-ui';

interface Node {
  id: string;
  label: string;
  children?: Node[];
}

const tree: Node[] = [
  {
    id: 'docs',
    label: 'Documentation',
    children: [
      { id: 'docs/getting-started', label: 'Getting Started' },
      { id: 'docs/components', label: 'Components' },
      { id: 'docs/recipes', label: 'Recipes' },
    ],
  },
  {
    id: 'design',
    label: 'Design Tokens',
    children: [
      { id: 'design/colors', label: 'Colors' },
      { id: 'design/spacing', label: 'Spacing' },
    ],
  },
  { id: 'changelog', label: 'CHANGELOG.md' },
];

const expanded = ref(new Set<string>(['docs']));
const selected = ref<string | null>('docs/components');
</script>

<template>
  <div class="tree-frame">
    <CoarTree
      :nodes="tree"
      :get-id="(n: Node) => n.id"
      :get-children="(n: Node) => n.children"
      :get-label="(n: Node) => n.label"
      v-model:expanded="expanded"
      v-model:selected="selected"
    >
      <template #default="{ node }">
        <span
          v-tooltip="{ content: node.label, onlyOnOverflow: '.tree-row__label' }"
          class="tree-row__main"
        >
          <CoarIcon
            :name="node.children ? 'folder' : 'file-text'"
            size="xs"
            class="tree-row__icon"
          />
          <span class="tree-row__label">{{ node.label }}</span>
        </span>
      </template>
    </CoarTree>
  </div>
  <p class="tree-state">Selected: <code>{{ selected ?? '—' }}</code></p>
</template>

<style scoped>
.tree-frame {
  border: 1px solid var(--coar-border-neutral-secondary);
  border-radius: 8px;
  padding: 4px 0;
  max-width: 360px;
}
.tree-row__main {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}
.tree-row__icon {
  color: var(--coar-text-neutral-tertiary);
  flex-shrink: 0;
}
.tree-row__label {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tree-state {
  margin-top: 12px;
  font-size: 13px;
  color: var(--coar-text-neutral-secondary);
}
</style>
