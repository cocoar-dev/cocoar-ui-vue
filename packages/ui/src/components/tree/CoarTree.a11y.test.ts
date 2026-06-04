import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref, type Component } from 'vue';
import CoarTreeRaw from './CoarTree.vue';
import type { CoarTreeLabels } from './tree-types';

const CoarTree = CoarTreeRaw as Component;

interface DemoNode {
  id: string;
  name: string;
  children?: DemoNode[];
}

function makeWrapper(opts: {
  nodes?: DemoNode[];
  expanded?: Set<string>;
  ariaLabel?: string;
  labels?: Partial<CoarTreeLabels>;
} = {}) {
  const nodes = ref<DemoNode[]>(
    opts.nodes ?? [
      { id: 'r1', name: 'R1', children: [{ id: 'c1', name: 'C1' }] },
      { id: 'r2', name: 'R2', children: [{ id: 'd1', name: 'D1' }] },
      { id: 'r3', name: 'R3' },
    ],
  );
  const expanded = ref(opts.expanded ?? new Set<string>());
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
          ariaLabel: opts.ariaLabel,
          labels: opts.labels,
          expanded: expanded.value,
          'onUpdate:expanded': (v: Set<string>) => (expanded.value = v),
        },
        { default: ({ node }: { node: DemoNode }) => h('span', null, node.name), empty: () => 'Empty' },
      ),
  });
  const wrapper = mount(Wrapper, { attachTo: document.body });
  const keydown = (init: Partial<KeyboardEvent>) => wrapper.find('.coar-tree').trigger('keydown', init);
  return { wrapper, nodes, expanded, keydown };
}

describe('CoarTree a11y / i18n', () => {
  it('binds ariaLabel to the role=tree element', () => {
    const { wrapper } = makeWrapper({ ariaLabel: 'Project files' });
    expect(wrapper.find('[role="tree"]').attributes('aria-label')).toBe('Project files');
  });

  it('uses overridden labels for the chevron', () => {
    const { wrapper } = makeWrapper({ labels: { expand: 'Aufklappen', collapse: 'Zuklappen' } });
    const chevron = wrapper.find('[data-node-id="r1"] .coar-tree-node__chevron');
    expect(chevron.attributes('aria-label')).toBe('Aufklappen'); // collapsed → expand label
  });

  it('"*" expands all expandable siblings at the focused level', async () => {
    const { wrapper, expanded, keydown } = makeWrapper();
    await wrapper.find('[data-node-id="r1"]').trigger('click'); // focus r1 (root level)
    await keydown({ key: '*' });
    expect(expanded.value.has('r1')).toBe(true);
    expect(expanded.value.has('r2')).toBe(true); // sibling folder expands too
  });

  it('PageDown jumps toward the end of the list', async () => {
    const { wrapper, keydown } = makeWrapper();
    await wrapper.find('[data-node-id="r1"]').trigger('click');
    await keydown({ key: 'PageDown' }); // page > list → last row
    await nextTick();
    expect(wrapper.find('[data-node-id="r3"]').attributes('tabindex')).toBe('0');
  });

  it('re-seeds focus to the neighbor in the deleted row slot (not the top)', async () => {
    const { wrapper, nodes } = makeWrapper({
      nodes: [
        { id: 'r1', name: 'R1' },
        { id: 'r2', name: 'R2' },
        { id: 'r3', name: 'R3' },
      ],
    });
    await wrapper.find('[data-node-id="r2"]').trigger('click'); // focus r2 (index 1)
    expect(wrapper.find('[data-node-id="r2"]').attributes('tabindex')).toBe('0');
    nodes.value = [
      { id: 'r1', name: 'R1' },
      { id: 'r3', name: 'R3' },
    ]; // delete r2 → r3 slides into index 1
    await nextTick();
    await nextTick();
    expect(wrapper.find('[data-node-id="r3"]').attributes('tabindex')).toBe('0');
    expect(wrapper.find('[data-node-id="r1"]').attributes('tabindex')).toBe('-1');
  });

  it('keeps an empty tree reachable by Tab', () => {
    const { wrapper } = makeWrapper({ nodes: [] });
    const empty = wrapper.find('.coar-tree__empty');
    expect(empty.attributes('tabindex')).toBe('0');
  });
});
