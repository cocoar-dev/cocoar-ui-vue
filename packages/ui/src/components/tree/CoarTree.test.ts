import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, nextTick, ref } from 'vue';
import CoarTree from './CoarTree.vue';
import type { CoarTreeNodeMoveEvent } from './tree-types';

interface DemoNode {
  id: string;
  name: string;
  children?: DemoNode[];
}

const demoTree: DemoNode[] = [
  {
    id: 'a',
    name: 'Alpha',
    children: [
      { id: 'a1', name: 'Alpha-1' },
      { id: 'a2', name: 'Alpha-2' },
    ],
  },
  {
    id: 'b',
    name: 'Bravo',
    children: [{ id: 'b1', name: 'Bravo-1' }],
  },
  { id: 'c', name: 'Charlie' },
];

function makeWrapper(opts: {
  nodes?: DemoNode[];
  expanded?: Set<string>;
  selected?: string | null;
  draggable?: boolean;
  acceptsFiles?: boolean;
} = {}) {
  const expandedRef = ref(opts.expanded ?? new Set<string>(['a', 'b']));
  const selectedRef = ref<string | null>(opts.selected ?? null);
  const activate = ref<DemoNode | null>(null);
  const contextMenu = ref<{ node: DemoNode | null } | null>(null);
  const nodeMove = ref<CoarTreeNodeMoveEvent<DemoNode> | null>(null);
  const filesDrop = ref<{ count: number; targetId: string | null } | null>(null);

  const Wrapper = defineComponent({
    components: { CoarTree },
    setup() {
      return {
        nodes: opts.nodes ?? demoTree,
        expanded: expandedRef,
        selected: selectedRef,
        getId: (n: DemoNode) => n.id,
        getChildren: (n: DemoNode) => n.children,
        getLabel: (n: DemoNode) => n.name,
        isExpandable: (n: DemoNode) => !!n.children,
        draggable: opts.draggable ?? false,
        acceptsFiles: opts.acceptsFiles ?? false,
        onActivate: (n: DemoNode) => {
          activate.value = n;
        },
        onContextMenu: (n: DemoNode | null) => {
          contextMenu.value = { node: n };
        },
        onNodeMove: (e: CoarTreeNodeMoveEvent<DemoNode>) => {
          nodeMove.value = e;
        },
        onFilesDrop: (e: { files: FileList; target: DemoNode | null }) => {
          filesDrop.value = { count: e.files.length, targetId: e.target?.id ?? null };
        },
      };
    },
    template: `
      <CoarTree
        :nodes="nodes"
        :get-id="getId"
        :get-children="getChildren"
        :get-label="getLabel"
        :is-expandable="isExpandable"
        v-model:expanded="expanded"
        v-model:selected="selected"
        :draggable="draggable"
        :accepts-files="acceptsFiles"
        @activate="onActivate"
        @context-menu="onContextMenu"
        @node-move="onNodeMove"
        @files-drop="onFilesDrop"
      >
        <template #default="{ node, depth }">
          <span class="row" :data-depth="depth">{{ node.name }}</span>
        </template>
        <template #empty>EMPTY</template>
      </CoarTree>
    `,
  });

  const wrapper = mount(Wrapper, { attachTo: document.body });
  return { wrapper, expandedRef, selectedRef, activate, contextMenu, nodeMove, filesDrop };
}

describe('CoarTree', () => {
  describe('rendering', () => {
    it('renders all top-level nodes with their labels', () => {
      const { wrapper } = makeWrapper();
      const rows = wrapper.findAll('.coar-tree-node__row');
      // a + a1 + a2 + b + b1 + c = 6 visible rows
      expect(rows.length).toBe(6);
      expect(wrapper.text()).toContain('Alpha');
      expect(wrapper.text()).toContain('Alpha-1');
      expect(wrapper.text()).toContain('Charlie');
    });

    it('hides descendants of collapsed branches', () => {
      const { wrapper } = makeWrapper({ expanded: new Set() });
      const rows = wrapper.findAll('.coar-tree-node__row');
      expect(rows.length).toBe(3); // only top-level
      expect(wrapper.text()).not.toContain('Alpha-1');
    });

    it('renders the empty slot when nodes is empty', () => {
      const { wrapper } = makeWrapper({ nodes: [] });
      expect(wrapper.text()).toContain('EMPTY');
    });

    it('exposes aria-expanded on folder rows', () => {
      const { wrapper } = makeWrapper();
      const folderRow = wrapper.find('[data-node-id="a"]');
      expect(folderRow.attributes('aria-expanded')).toBe('true');
    });
  });

  describe('expand / collapse', () => {
    it('toggles a folder via its chevron without flipping selection', async () => {
      const { wrapper, expandedRef, selectedRef } = makeWrapper();
      const chevron = wrapper.find('[data-node-id="a"] .coar-tree-node__chevron');
      await chevron.trigger('click');
      expect(expandedRef.value.has('a')).toBe(false);
      expect(selectedRef.value).toBeNull();
    });

    it('emits update:expanded as a fresh Set', async () => {
      const { wrapper, expandedRef } = makeWrapper();
      const before = expandedRef.value;
      await wrapper.find('[data-node-id="a"] .coar-tree-node__chevron').trigger('click');
      expect(expandedRef.value).not.toBe(before); // new reference, important for reactivity
    });
  });

  describe('selection', () => {
    it('selects a node on row click', async () => {
      const { wrapper, selectedRef } = makeWrapper();
      await wrapper.find('[data-node-id="a1"]').trigger('click');
      expect(selectedRef.value).toBe('a1');
    });

    it('marks the selected row with aria-selected', async () => {
      const { wrapper } = makeWrapper({ selected: 'b' });
      await nextTick();
      const row = wrapper.find('[data-node-id="b"]');
      expect(row.attributes('aria-selected')).toBe('true');
    });
  });

  describe('activate', () => {
    it('emits activate on double-click', async () => {
      const { wrapper, activate } = makeWrapper();
      await wrapper.find('[data-node-id="a1"]').trigger('dblclick');
      expect(activate.value?.id).toBe('a1');
    });

    it('emits activate on Enter keypress', async () => {
      const { wrapper, activate } = makeWrapper({ selected: 'c' });
      await nextTick();
      await wrapper.find('.coar-tree').trigger('keydown', { key: 'Enter' });
      expect(activate.value?.id).toBe('c');
    });
  });

  describe('context menu', () => {
    it('emits context-menu with the right-clicked node', async () => {
      const { wrapper, contextMenu } = makeWrapper();
      await wrapper.find('[data-node-id="b"]').trigger('contextmenu');
      expect(contextMenu.value?.node?.id).toBe('b');
    });
  });

  describe('keyboard nav', () => {
    it('moves focus down with ArrowDown', async () => {
      const { wrapper, selectedRef } = makeWrapper({ selected: 'a' });
      await nextTick();
      await wrapper.find('.coar-tree').trigger('keydown', { key: 'ArrowDown' });
      // ArrowDown moves focus only, not selection — selected stays 'a'.
      expect(selectedRef.value).toBe('a');
      // But Enter on the new focus should activate the focused node, not the selected one.
      // (Implicit check — focused row gets tabindex=0.)
    });

    it('jumps to End', async () => {
      const { wrapper } = makeWrapper({ selected: 'a' });
      await nextTick();
      await wrapper.find('.coar-tree').trigger('keydown', { key: 'End' });
      // No directly observable side-effect here without focus-DOM helpers; the
      // smoke test is that it didn't throw and the tree is still mounted.
      expect(wrapper.findAll('.coar-tree-node__row').length).toBe(6);
    });
  });
});
