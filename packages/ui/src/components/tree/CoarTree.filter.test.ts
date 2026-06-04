import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref, type Component } from 'vue';
import CoarTreeRaw from './CoarTree.vue';

const CoarTree = CoarTreeRaw as Component;

interface DemoNode {
  id: string;
  name: string;
  children?: DemoNode[];
}
const deepTree: DemoNode[] = [
  { id: 'r1', name: 'R1', children: [{ id: 'c1', name: 'C1', children: [{ id: 'leaf1', name: 'Leaf1' }] }] },
  { id: 'r2', name: 'R2' },
];

function makeWrapper(matched: Set<string>) {
  const expanded = ref(new Set<string>());
  const matchedIds = ref(matched);
  const Wrapper = defineComponent({
    setup: () => () =>
      h(
        CoarTree,
        {
          nodes: deepTree,
          getId: (n: DemoNode) => n.id,
          getChildren: (n: DemoNode) => n.children,
          getLabel: (n: DemoNode) => n.name,
          isExpandable: (n: DemoNode) => !!n.children,
          matchedIds: matchedIds.value,
          expanded: expanded.value,
          'onUpdate:expanded': (v: Set<string>) => (expanded.value = v),
        },
        {
          default: ({ node, isMatch, isMatchAncestor }: { node: DemoNode; isMatch: boolean; isMatchAncestor: boolean }) =>
            h('span', { class: { 'is-match': isMatch, 'is-anc': isMatchAncestor } }, node.name),
        },
      ),
  });
  const wrapper = mount(Wrapper, { attachTo: document.body });
  return { wrapper, expanded };
}

describe('CoarTree search / filter helpers', () => {
  it('auto-expands the ancestors of a deep match', async () => {
    const { expanded } = makeWrapper(new Set(['leaf1']));
    await nextTick();
    expect(expanded.value.has('r1')).toBe(true);
    expect(expanded.value.has('c1')).toBe(true);
  });

  it('exposes isMatch on the hit and isMatchAncestor on its ancestors', async () => {
    const { wrapper } = makeWrapper(new Set(['leaf1']));
    await nextTick();
    expect(wrapper.find('[data-node-id="leaf1"] .is-match').exists()).toBe(true);
    expect(wrapper.find('[data-node-id="leaf1"] .is-anc').exists()).toBe(false);
    expect(wrapper.find('[data-node-id="r1"] .is-anc').exists()).toBe(true);
    expect(wrapper.find('[data-node-id="r1"] .is-match').exists()).toBe(false);
    // a non-matching, non-ancestor row has neither
    expect(wrapper.find('[data-node-id="r2"] .is-match').exists()).toBe(false);
    expect(wrapper.find('[data-node-id="r2"] .is-anc').exists()).toBe(false);
  });
});
