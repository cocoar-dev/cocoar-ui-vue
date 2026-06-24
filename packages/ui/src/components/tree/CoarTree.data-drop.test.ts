import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref, type Component } from 'vue';
import CoarTreeRaw from './CoarTree.vue';
import type { CoarTreeDataDropEvent, CoarTreeNodeMoveEvent } from './tree-types';

const CoarTree = CoarTreeRaw as Component;
const MIME = 'application/x-foo';

interface DemoNode {
  id: string;
  name: string;
  children?: DemoNode[];
}
const demoTree: DemoNode[] = [
  { id: 'a', name: 'Alpha', children: [{ id: 'a1', name: 'Alpha-1' }] },
  { id: 'c', name: 'Charlie' },
];

/** A drag carrying a single app-internal MIME (what `acceptsData` matches). */
function makeDataTransfer(mime: string, payload: string): DataTransfer {
  return {
    types: [mime],
    files: [] as unknown as FileList,
    dropEffect: 'none',
    effectAllowed: 'all',
    setData() {},
    getData(t: string) {
      return t === mime ? payload : '';
    },
    setDragImage() {},
  } as unknown as DataTransfer;
}

/** Recording stub for an INTERNAL node drag (records COAR_TREE_DRAG_MIME on dragstart). */
function makeNodeTransfer(): DataTransfer {
  const store: Record<string, string> = {};
  return {
    types: [] as string[],
    files: [] as unknown as FileList,
    dropEffect: 'none',
    effectAllowed: 'all',
    setData(type: string, val: string) {
      store[type] = val;
      const self = this as unknown as { types: string[] };
      if (!self.types.includes(type)) self.types.push(type);
    },
    getData(type: string) {
      return store[type] ?? '';
    },
    setDragImage() {},
  } as unknown as DataTransfer;
}

function makeWrapper() {
  const dataDrop = ref<{ nodeId: string | null; position: string; payload: string } | null>(null);
  const nodeMove = ref<CoarTreeNodeMoveEvent<DemoNode> | null>(null);
  const expandedRef = ref(new Set<string>(['a']));
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
          draggable: true,
          acceptsData: [MIME],
          expanded: expandedRef.value,
          'onUpdate:expanded': (v: Set<string>) => (expandedRef.value = v),
          onDataDrop: (e: CoarTreeDataDropEvent<DemoNode>) => {
            dataDrop.value = {
              nodeId: e.node?.id ?? null,
              position: e.position,
              payload: e.dataTransfer.getData(MIME),
            };
          },
          onNodeMove: (e: CoarTreeNodeMoveEvent<DemoNode>) => (nodeMove.value = e),
        },
        { default: ({ node }: { node: DemoNode }) => h('span', null, node.name) },
      ),
  });
  const wrapper = mount(Wrapper, { attachTo: document.body });
  return { wrapper, dataDrop, nodeMove };
}

describe('CoarTree app-internal data drop (acceptsData / @data-drop)', () => {
  it('emits data-drop onto a row with the node + payload', async () => {
    const { wrapper, dataDrop } = makeWrapper();
    await nextTick();
    const dt = makeDataTransfer(MIME, 'asset-42');
    await wrapper.find('[data-node-id="a"]').trigger('dragover', { dataTransfer: dt });
    await wrapper.find('[data-node-id="a"]').trigger('drop', { dataTransfer: dt });
    expect(dataDrop.value?.nodeId).toBe('a');
    expect(dataDrop.value?.payload).toBe('asset-42');
    expect(['before', 'inside', 'after']).toContain(dataDrop.value?.position);
  });

  it('emits data-drop on the empty background with node null + position inside', async () => {
    const { wrapper, dataDrop } = makeWrapper();
    await nextTick();
    const dt = makeDataTransfer(MIME, 'asset-bg');
    await wrapper.find('.coar-tree').trigger('dragover', { dataTransfer: dt });
    await wrapper.find('.coar-tree').trigger('drop', { dataTransfer: dt });
    expect(dataDrop.value?.nodeId).toBeNull();
    expect(dataDrop.value?.position).toBe('inside');
    expect(dataDrop.value?.payload).toBe('asset-bg');
  });

  it('ignores a drag whose MIME is not in acceptsData', async () => {
    const { wrapper, dataDrop } = makeWrapper();
    await nextTick();
    const dt = makeDataTransfer('application/x-other', 'nope');
    await wrapper.find('[data-node-id="a"]').trigger('dragover', { dataTransfer: dt });
    await wrapper.find('[data-node-id="a"]').trigger('drop', { dataTransfer: dt });
    expect(dataDrop.value).toBeNull();
  });

  it('does NOT treat an internal node drag as a data drop (node-move still wins)', async () => {
    const { wrapper, dataDrop, nodeMove } = makeWrapper();
    await nextTick();
    const dt = makeNodeTransfer();
    // Drag 'c' onto 'a' — an internal node move, even though acceptsData is set.
    await wrapper.find('[data-node-id="c"]').trigger('dragstart', { dataTransfer: dt });
    await wrapper.find('[data-node-id="a"]').trigger('dragover', { dataTransfer: dt });
    await wrapper.find('[data-node-id="a"]').trigger('drop', { dataTransfer: dt });
    expect(dataDrop.value).toBeNull();
    expect(nodeMove.value?.source.id).toBe('c');
    expect(nodeMove.value?.target?.id).toBe('a');
  });
});
