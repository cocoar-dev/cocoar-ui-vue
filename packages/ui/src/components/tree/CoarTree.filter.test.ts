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

function makeWrapper(matched: Set<string>, filter = false, filterMode: 'strict' | 'lenient' = 'strict') {
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
          filter,
          filterMode,
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

  describe('filter mode (filter=true)', () => {
    const visibleIds = (wrapper: ReturnType<typeof makeWrapper>['wrapper']) =>
      wrapper.findAll('[role="treeitem"]').map((r) => r.attributes('data-node-id'));

    it('hides non-matches but keeps the match + its ancestor path (virtual parents)', async () => {
      const { wrapper } = makeWrapper(new Set(['leaf1']), true);
      await nextTick();
      await nextTick();
      const ids = visibleIds(wrapper);
      expect(ids).toEqual(['r1', 'c1', 'leaf1']); // r2 (irrelevant) hidden; ancestors kept
      expect(wrapper.find('[data-node-id="r2"]').exists()).toBe(false);
      // the kept ancestors are flagged as virtual parents
      expect(wrapper.find('[data-node-id="r1"] .is-anc').exists()).toBe(true);
    });

    it('strict (default): a matched folder does NOT reveal its non-matching descendants', async () => {
      const { wrapper } = makeWrapper(new Set(['c1']), true); // c1 folder matches; default strict
      await nextTick();
      await nextTick();
      const ids = visibleIds(wrapper);
      expect(ids).toEqual(['r1', 'c1']); // ancestor r1 + match c1; leaf1 (non-matching child) hidden
    });

    it('lenient: a matched folder DOES reveal its whole subtree', async () => {
      const { wrapper } = makeWrapper(new Set(['c1']), true, 'lenient');
      await nextTick();
      await nextTick();
      const ids = visibleIds(wrapper);
      expect(ids).toEqual(['r1', 'c1', 'leaf1']); // ancestor + match + descendant
    });

    it('corrects aria-setsize to the kept siblings', async () => {
      const { wrapper } = makeWrapper(new Set(['leaf1']), true);
      await nextTick();
      await nextTick();
      // only r1 survives at the root level → setsize 1 (not 2)
      expect(wrapper.find('[data-node-id="r1"]').attributes('aria-setsize')).toBe('1');
    });

    it('shows everything again when the filter clears (empty matchedIds)', async () => {
      const { wrapper } = makeWrapper(new Set(), true); // filter on but no matches
      await nextTick();
      expect(visibleIds(wrapper)).toContain('r2'); // no filtering applied
    });
  });
});
