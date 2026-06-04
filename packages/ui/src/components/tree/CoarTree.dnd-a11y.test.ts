import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref, type Component } from 'vue';
import CoarTreeRaw from './CoarTree.vue';
import { useTree } from './useTree';
import type { CoarTreeNodeMoveEvent } from './tree-types';

const CoarTree = CoarTreeRaw as Component;

interface DemoNode {
  id: string;
  name: string;
  children?: DemoNode[];
}
const demoTree: DemoNode[] = [
  { id: 'a', name: 'Alpha', children: [{ id: 'a1', name: 'A-1' }, { id: 'a2', name: 'A-2' }] },
  { id: 'b', name: 'Bravo' },
];

function makeWrapper() {
  const { builder, api } = useTree<DemoNode>();
  const moves: CoarTreeNodeMoveEvent<DemoNode>[] = [];
  const expanded = ref(new Set<string>(['a']));
  builder
    .nodes(demoTree)
    .getId((n) => n.id)
    .getChildren((n) => n.children)
    .getLabel((n) => n.name)
    .draggable(true)
    .expanded(expanded)
    .onNodeMove((e) => moves.push(e));
  const Wrapper = defineComponent({
    setup: () => () =>
      h(CoarTree, { builder }, { default: ({ node }: { node: DemoNode }) => h('span', null, node.name) }),
  });
  const wrapper = mount(Wrapper, { attachTo: document.body });
  const keydown = (init: Partial<KeyboardEvent>) => wrapper.find('.coar-tree').trigger('keydown', init);
  const live = () => wrapper.find('.coar-tree__sr-live').text();
  return { wrapper, api, moves, keydown, live };
}

describe('CoarTree DnD accessibility', () => {
  it('api.moveNode emits node-move and runs the cycle guard', async () => {
    const { api, moves } = makeWrapper();
    await nextTick();
    expect(api.moveNode('a1', 'b', 'after')).toBe(true);
    expect(moves.at(-1)).toMatchObject({ source: { id: 'a1' }, target: { id: 'b' }, position: 'after' });
    // moving a folder into its own child is a cycle → rejected, no emit
    expect(api.moveNode('a', 'a1', 'inside')).toBe(false);
    expect(moves).toHaveLength(1);
  });

  it('keyboard cut/paste (Ctrl+X … Ctrl+V) moves a node', async () => {
    const { wrapper, moves, keydown } = makeWrapper();
    await nextTick();
    await wrapper.find('[data-node-id="a1"]').trigger('click'); // focus a1
    await keydown({ key: 'x', ctrlKey: true }); // grab
    await wrapper.find('[data-node-id="b"]').trigger('click'); // focus b
    await keydown({ key: 'v', ctrlKey: true }); // drop
    expect(moves.at(-1)).toMatchObject({ source: { id: 'a1' }, target: { id: 'b' }, position: 'after' });
  });

  it('Escape cancels a grab without moving', async () => {
    const { wrapper, moves, keydown } = makeWrapper();
    await nextTick();
    await wrapper.find('[data-node-id="a1"]').trigger('click');
    await keydown({ key: 'x', ctrlKey: true });
    await keydown({ key: 'Escape' });
    await wrapper.find('[data-node-id="b"]').trigger('click');
    await keydown({ key: 'v', ctrlKey: true });
    expect(moves).toHaveLength(0);
  });

  it('announces pick-up via the polite live region', async () => {
    const { wrapper, keydown, live } = makeWrapper();
    await nextTick();
    await wrapper.find('[data-node-id="a1"]').trigger('click');
    await keydown({ key: 'x', ctrlKey: true });
    await nextTick();
    expect(live()).toContain('Picked up A-1');
  });
});
