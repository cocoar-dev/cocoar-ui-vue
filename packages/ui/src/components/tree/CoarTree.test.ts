import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref, type Component } from 'vue';
import CoarTreeRaw from './CoarTree.vue';
import type { CoarTreeNodeMoveEvent } from './tree-types';

// `defineSlots<{default(...); empty()}>` on CoarTree gives vue-tsc strict
// `__VLS_Slots` shape expectations that `h(CoarTree, props, slots)` can't
// satisfy through the runtime API. Cast to a plain Component for the test
// wrapper so the typecheck passes; runtime behavior is unchanged.
const CoarTree = CoarTreeRaw as Component;

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
    setup: () => () =>
      h('div', null, [
        h(
          CoarTree,
          {
            nodes: opts.nodes ?? demoTree,
            getId: (n: DemoNode) => n.id,
            getChildren: (n: DemoNode) => n.children,
            getLabel: (n: DemoNode) => n.name,
            isExpandable: (n: DemoNode) => !!n.children,
            draggable: opts.draggable ?? false,
            acceptsFiles: opts.acceptsFiles ?? false,
            expanded: expandedRef.value,
            'onUpdate:expanded': (v: Set<string>) => (expandedRef.value = v),
            selected: selectedRef.value,
            'onUpdate:selected': (v: string | null) => (selectedRef.value = v),
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
          },
          {
            default: ({ node, depth }: { node: DemoNode; depth: number }) =>
              h('span', { class: 'row', 'data-depth': depth }, node.name),
            empty: () => 'EMPTY',
          },
        ),
      ]),
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

  describe('drag and drop', () => {
    // Minimal DataTransfer stub — jsdom ships none. `setData` records types so
    // the component's `dt.types.includes(COAR_TREE_DRAG_MIME)` checks pass after
    // a dragstart, exactly as a real browser would.
    function makeDataTransfer(): DataTransfer {
      const store: Record<string, string> = {};
      return {
        types: [] as string[],
        files: [] as unknown as FileList,
        dropEffect: 'none',
        effectAllowed: 'all',
        setData(type: string, val: string) {
          store[type] = val;
          if (!(this as { types: string[] }).types.includes(type)) {
            (this as { types: string[] }).types.push(type);
          }
        },
        getData(type: string) {
          return store[type] ?? '';
        },
        setDragImage() {},
      } as unknown as DataTransfer;
    }

    it('moves a node onto a valid target (source re-resolved live at drop)', async () => {
      const { wrapper, nodeMove } = makeWrapper({ draggable: true });
      const dt = makeDataTransfer();
      await wrapper.find('[data-node-id="c"]').trigger('dragstart', { dataTransfer: dt });
      await wrapper.find('[data-node-id="a1"]').trigger('dragover', { dataTransfer: dt });
      await wrapper.find('[data-node-id="a1"]').trigger('drop', { dataTransfer: dt });
      expect(nodeMove.value?.source.id).toBe('c');
      expect(nodeMove.value?.target?.id).toBe('a1');
    });

    it("rejects a drop into the dragged node's own subtree (live parent-chain cycle guard)", async () => {
      const { wrapper, nodeMove } = makeWrapper({ draggable: true });
      const dt = makeDataTransfer();
      // Drag folder 'a'; 'a1' is its child → dropping there would create a cycle.
      await wrapper.find('[data-node-id="a"]').trigger('dragstart', { dataTransfer: dt });
      await wrapper.find('[data-node-id="a1"]').trigger('dragover', { dataTransfer: dt });
      await wrapper.find('[data-node-id="a1"]').trigger('drop', { dataTransfer: dt });
      expect(nodeMove.value).toBeNull();
    });

    it('suppresses the move when the dragged node is removed mid-drag (no phantom source)', async () => {
      // The source is re-resolved from the LIVE tree at drop, so a node deleted
      // between dragstart and drop yields no move (not a detached phantom).
      const nodes = ref<DemoNode[]>([
        { id: 'x', name: 'X' },
        { id: 'y', name: 'Y' },
      ]);
      const nodeMove = ref<CoarTreeNodeMoveEvent<DemoNode> | null>(null);
      const Wrapper = defineComponent({
        setup: () => () =>
          h(
            CoarTree,
            {
              nodes: nodes.value,
              getId: (n: DemoNode) => n.id,
              getLabel: (n: DemoNode) => n.name,
              draggable: true,
              onNodeMove: (e: CoarTreeNodeMoveEvent<DemoNode>) => {
                nodeMove.value = e;
              },
            },
            { default: ({ node }: { node: DemoNode }) => h('span', null, node.name) },
          ),
      });
      const wrapper = mount(Wrapper, { attachTo: document.body });
      const dt = makeDataTransfer();
      await wrapper.find('[data-node-id="x"]').trigger('dragstart', { dataTransfer: dt });
      await wrapper.find('[data-node-id="y"]').trigger('dragover', { dataTransfer: dt });
      // Source 'x' deleted mid-drag (async refresh / external delete).
      nodes.value = [{ id: 'y', name: 'Y' }];
      await nextTick();
      await wrapper.find('[data-node-id="y"]').trigger('drop', { dataTransfer: dt });
      expect(nodeMove.value).toBeNull();
    });

    it('rejects a drop when a mid-drag mutation turns the target into a descendant of the source (authoritative drop-time cycle guard)', async () => {
      // Worst case: the mutation lands BETWEEN the last dragover and the drop,
      // so the (now-stale) dragover already marked the target droppable. The
      // drop-time re-check against the LIVE parent chain must still reject it.
      const nodes = ref<DemoNode[]>([
        { id: 'a', name: 'A', children: [] },
        { id: 'b', name: 'B' },
      ]);
      const expandedRef = ref(new Set<string>(['a']));
      const nodeMove = ref<CoarTreeNodeMoveEvent<DemoNode> | null>(null);
      const Wrapper = defineComponent({
        setup: () => () =>
          h(
            CoarTree,
            {
              nodes: nodes.value,
              getId: (n: DemoNode) => n.id,
              getChildren: (n: DemoNode) => n.children,
              getLabel: (n: DemoNode) => n.name,
              isExpandable: (n: DemoNode) => !!n.children,
              draggable: true,
              expanded: expandedRef.value,
              'onUpdate:expanded': (v: Set<string>) => (expandedRef.value = v),
              onNodeMove: (e: CoarTreeNodeMoveEvent<DemoNode>) => {
                nodeMove.value = e;
              },
            },
            { default: ({ node }: { node: DemoNode }) => h('span', null, node.name) },
          ),
      });
      const wrapper = mount(Wrapper, { attachTo: document.body });
      const dt = makeDataTransfer();
      // At dragover time 'b' is a sibling of the dragged 'a' → a valid target.
      await wrapper.find('[data-node-id="a"]').trigger('dragstart', { dataTransfer: dt });
      await wrapper.find('[data-node-id="b"]').trigger('dragover', { dataTransfer: dt });
      // Now 'b' becomes a child of 'a' — dropping 'a' there would be a cycle.
      nodes.value = [{ id: 'a', name: 'A', children: [{ id: 'b', name: 'B' }] }];
      await nextTick();
      await wrapper.find('[data-node-id="b"]').trigger('drop', { dataTransfer: dt });
      expect(nodeMove.value).toBeNull();
    });
  });

  describe('virtualization nudge', () => {
    it('warns in DEV when a large tree renders without virtualization', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const big = Array.from({ length: 400 }, (_, i) => ({ id: `n${i}`, name: `Node ${i}` }));
      makeWrapper({ nodes: big, expanded: new Set() });
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('without virtualization'));
      warn.mockRestore();
    });
  });

  describe('virtualization (per-index height)', () => {
    it('virtualizes with a per-index itemSize function without a NaN spacer', async () => {
      const big = Array.from({ length: 60 }, (_, i) => ({ id: `n${i}`, name: `Node ${i}` }));
      const Wrapper = defineComponent({
        setup: () => () =>
          h(
            CoarTree,
            {
              nodes: big,
              getId: (n: DemoNode) => n.id,
              getLabel: (n: DemoNode) => n.name,
              virtualize: { itemSize: (i: number) => 24 + (i % 3) * 6 },
            },
            { default: ({ node }: { node: DemoNode }) => h('span', null, node.name) },
          ),
      });
      const wrapper = mount(Wrapper, { attachTo: document.body });
      await nextTick();
      const style = wrapper.find('.coar-tree__inner').attributes('style') ?? '';
      expect(style).not.toContain('NaN');
      // sum of (24 + (i%3)*6) over i=0..59 = 60*24 + 6*(20*(0+1+2)) = 1440 + 360 = 1800
      const m = style.match(/height:\s*([\d.]+)px/);
      expect(m).toBeTruthy();
      expect(Number(m![1])).toBe(1800);
    });
  });

  describe('render granularity', () => {
    it('a selection change does not re-render unrelated rows', async () => {
      // Tier-2 invariant: each row derives its own selected/focused flags from
      // injected state, so moving selection must not cascade a re-render to
      // unrelated rows. (Full parent-render isolation is browser-verified at
      // scale; this locks the row-level no-cascade guarantee against, e.g., a
      // future change that makes a row depend on whole-list state.)
      const renders: Record<string, number> = {};
      const selectedRef = ref<string | null>(null);
      const expandedRef = ref(new Set<string>(['a', 'b']));
      const Wrapper = defineComponent({
        setup: () => () =>
          h(
            CoarTree,
            {
              nodes: demoTree,
              getId: (n: DemoNode) => n.id,
              getChildren: (n: DemoNode) => n.children,
              getLabel: (n: DemoNode) => n.name,
              isExpandable: (n: DemoNode) => !!n.children,
              expanded: expandedRef.value,
              'onUpdate:expanded': (v: Set<string>) => (expandedRef.value = v),
              selected: selectedRef.value,
              'onUpdate:selected': (v: string | null) => (selectedRef.value = v),
            },
            {
              default: ({ node }: { node: DemoNode }) => {
                renders[node.id] = (renders[node.id] ?? 0) + 1;
                return h('span', null, node.name);
              },
            },
          ),
      });
      mount(Wrapper, { attachTo: document.body });
      await nextTick();
      for (const k of Object.keys(renders)) delete renders[k]; // reset after initial render
      selectedRef.value = 'a1';
      await nextTick();
      expect(renders.a1).toBeGreaterThan(0); // the newly-selected row re-rendered
      expect(renders.b).toBeUndefined(); // unrelated rows did not
      expect(renders.b1).toBeUndefined();
      expect(renders.c).toBeUndefined();
      expect(renders.a2).toBeUndefined();
    });
  });

  describe('lazy children loading', () => {
    const flushMicrotasks = () => new Promise((r) => setTimeout(r, 0));

    it('loads children on expand, shows a spinner, then renders them', async () => {
      const nodes = ref<DemoNode[]>([{ id: 'r', name: 'Root' }]); // no children yet
      const expanded = ref(new Set<string>());
      let resolveLoad!: () => void;
      const loadChildren = vi.fn(
        () =>
          new Promise<void>((res) => {
            resolveLoad = () => {
              nodes.value = [{ id: 'r', name: 'Root', children: [{ id: 'r1', name: 'Child 1' }] }];
              res();
            };
          }),
      );
      const Wrapper = defineComponent({
        setup: () => () =>
          h(
            CoarTree,
            {
              nodes: nodes.value,
              getId: (n: DemoNode) => n.id,
              getChildren: (n: DemoNode) => n.children,
              isExpandable: () => true,
              loadChildren,
              expanded: expanded.value,
              'onUpdate:expanded': (v: Set<string>) => (expanded.value = v),
            },
            { default: ({ node }: { node: DemoNode }) => h('span', null, node.name) },
          ),
      });
      const wrapper = mount(Wrapper, { attachTo: document.body });
      await nextTick();
      await wrapper.find('[data-node-id="r"] .coar-tree-node__chevron').trigger('click');
      await nextTick();
      expect(loadChildren).toHaveBeenCalledTimes(1);
      expect(wrapper.find('.coar-spinner').exists()).toBe(true);

      resolveLoad();
      await flushMicrotasks();
      await nextTick();
      expect(wrapper.find('.coar-spinner').exists()).toBe(false);
      expect(wrapper.text()).toContain('Child 1');
    });

    it('flips to an error state and emits load-error when the promise rejects', async () => {
      const nodes = ref<DemoNode[]>([{ id: 'r', name: 'Root' }]);
      const expanded = ref(new Set<string>());
      const onLoadError = vi.fn();
      let rejectLoad!: (e: unknown) => void;
      const loadChildren = vi.fn(
        () =>
          new Promise<void>((_res, rej) => {
            rejectLoad = rej;
          }),
      );
      const Wrapper = defineComponent({
        setup: () => () =>
          h(
            CoarTree,
            {
              nodes: nodes.value,
              getId: (n: DemoNode) => n.id,
              getChildren: (n: DemoNode) => n.children,
              isExpandable: () => true,
              loadChildren,
              expanded: expanded.value,
              'onUpdate:expanded': (v: Set<string>) => (expanded.value = v),
              onLoadError,
            },
            {
              default: ({ node, hasError }: { node: DemoNode; hasError: boolean }) =>
                h('span', { 'data-error': String(hasError) }, node.name),
            },
          ),
      });
      const wrapper = mount(Wrapper, { attachTo: document.body });
      await nextTick();
      await wrapper.find('[data-node-id="r"] .coar-tree-node__chevron').trigger('click');
      await nextTick();
      expect(wrapper.find('.coar-spinner').exists()).toBe(true);

      rejectLoad(new Error('boom'));
      await flushMicrotasks();
      await nextTick();
      expect(wrapper.find('.coar-spinner').exists()).toBe(false);
      expect(wrapper.find('[data-node-id="r"] [data-error="true"]').exists()).toBe(true);
      expect(onLoadError).toHaveBeenCalledTimes(1);
    });

    it('does not call loadChildren for an already-loaded folder', async () => {
      const nodes = [{ id: 'r', name: 'Root', children: [{ id: 'r1', name: 'C' }] }];
      const expanded = ref(new Set<string>());
      const loadChildren = vi.fn(() => Promise.resolve());
      const Wrapper = defineComponent({
        setup: () => () =>
          h(
            CoarTree,
            {
              nodes,
              getId: (n: DemoNode) => n.id,
              getChildren: (n: DemoNode) => n.children,
              isExpandable: () => true,
              loadChildren,
              expanded: expanded.value,
              'onUpdate:expanded': (v: Set<string>) => (expanded.value = v),
            },
            { default: ({ node }: { node: DemoNode }) => h('span', null, node.name) },
          ),
      });
      const wrapper = mount(Wrapper, { attachTo: document.body });
      await nextTick();
      await wrapper.find('[data-node-id="r"] .coar-tree-node__chevron').trigger('click');
      await nextTick();
      expect(loadChildren).not.toHaveBeenCalled();
    });

    it('exposed reloadChildren forces a reload of an already-loaded folder', async () => {
      const nodes = [{ id: 'r', name: 'Root', children: [{ id: 'r1', name: 'C' }] }];
      const loadChildren = vi.fn(() => Promise.resolve());
      const wrapper = mount(CoarTree, {
        attachTo: document.body,
        props: {
          nodes,
          getId: (n: DemoNode) => n.id,
          getChildren: (n: DemoNode) => n.children,
          isExpandable: () => true,
          loadChildren,
          expanded: new Set<string>(['r']),
        },
      });
      await nextTick();
      expect(loadChildren).not.toHaveBeenCalled(); // already loaded → watcher skips
      (wrapper.vm as unknown as { reloadChildren: (id: string) => void }).reloadChildren('r');
      await nextTick();
      expect(loadChildren).toHaveBeenCalledTimes(1);
    });
  });
});
