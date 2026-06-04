import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref, type Component } from 'vue';
import CoarTreeRaw from './CoarTree.vue';
import type { CoarTreeSelectionMode } from './tree-types';

const CoarTree = CoarTreeRaw as Component;

interface DemoNode {
  id: string;
  name: string;
  children?: DemoNode[];
}

const demoTree: DemoNode[] = [
  { id: 'a', name: 'Alpha', children: [{ id: 'a1', name: 'A-1' }, { id: 'a2', name: 'A-2' }] },
  { id: 'b', name: 'Bravo', children: [{ id: 'b1', name: 'B-1' }] },
  { id: 'c', name: 'Charlie' },
];
// Visible (a,b expanded): a, a1, a2, b, b1, c

function makeWrapper(opts: {
  selectionMode?: CoarTreeSelectionMode;
  checkStrictly?: boolean;
  selectedIds?: Set<string>;
  checkedIds?: Set<string>;
} = {}) {
  const expandedRef = ref(new Set<string>(['a', 'b']));
  const selectedIdsRef = ref(opts.selectedIds ?? new Set<string>());
  const checkedIdsRef = ref(opts.checkedIds ?? new Set<string>());
  const selectedRef = ref<string | null>(null);

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
          selectionMode: opts.selectionMode ?? 'single',
          checkStrictly: opts.checkStrictly ?? false,
          expanded: expandedRef.value,
          'onUpdate:expanded': (v: Set<string>) => (expandedRef.value = v),
          selected: selectedRef.value,
          'onUpdate:selected': (v: string | null) => (selectedRef.value = v),
          selectedIds: selectedIdsRef.value,
          'onUpdate:selectedIds': (v: Set<string>) => (selectedIdsRef.value = v),
          checkedIds: checkedIdsRef.value,
          'onUpdate:checkedIds': (v: Set<string>) => (checkedIdsRef.value = v),
        },
        { default: ({ node }: { node: DemoNode }) => h('span', { class: 'row' }, node.name) },
      ),
  });

  const wrapper = mount(Wrapper, { attachTo: document.body });
  const clickRow = (id: string, mods: Partial<MouseEvent> = {}) =>
    wrapper.find(`[data-node-id="${id}"]`).trigger('click', { button: 0, ...mods });
  const clickCheckbox = (id: string) =>
    wrapper.find(`[data-node-id="${id}"] .coar-tree-node__checkbox`).trigger('click');
  const keydown = (init: Partial<KeyboardEvent>) =>
    wrapper.find('.coar-tree').trigger('keydown', init);
  return { wrapper, expandedRef, selectedIdsRef, checkedIdsRef, selectedRef, clickRow, clickCheckbox, keydown };
}

describe('CoarTree selection', () => {
  describe('single (default)', () => {
    it('selects one row and omits aria-multiselectable', () => {
      const { wrapper, selectedRef, clickRow } = makeWrapper();
      clickRow('a1');
      expect(selectedRef.value).toBe('a1');
      expect(wrapper.find('[role="tree"]').attributes('aria-multiselectable')).toBeUndefined();
    });
  });

  describe('multiple', () => {
    it('plain click replaces selection with one row', async () => {
      const { selectedIdsRef, clickRow } = makeWrapper({ selectionMode: 'multiple' });
      await clickRow('a1');
      await clickRow('b1');
      expect([...selectedIdsRef.value]).toEqual(['b1']);
    });

    it('Ctrl+click toggles rows additively', async () => {
      const { selectedIdsRef, clickRow } = makeWrapper({ selectionMode: 'multiple' });
      await clickRow('a1');
      await clickRow('b1', { ctrlKey: true });
      expect([...selectedIdsRef.value].sort()).toEqual(['a1', 'b1']);
      await clickRow('a1', { ctrlKey: true });
      expect([...selectedIdsRef.value]).toEqual(['b1']);
    });

    it('Shift+click selects the visible range from the anchor', async () => {
      const { selectedIdsRef, clickRow } = makeWrapper({ selectionMode: 'multiple' });
      await clickRow('a1');
      await clickRow('b1', { shiftKey: true });
      // visible order a1,a2,b,b1
      expect([...selectedIdsRef.value].sort()).toEqual(['a1', 'a2', 'b', 'b1']);
    });

    it('Ctrl+A selects every visible row', async () => {
      const { selectedIdsRef, keydown } = makeWrapper({ selectionMode: 'multiple' });
      await keydown({ key: 'a', ctrlKey: true });
      expect([...selectedIdsRef.value].sort()).toEqual(['a', 'a1', 'a2', 'b', 'b1', 'c']);
    });

    it('sets aria-multiselectable on the tree container', () => {
      const { wrapper } = makeWrapper({ selectionMode: 'multiple' });
      expect(wrapper.find('[role="tree"]').attributes('aria-multiselectable')).toBe('true');
    });
  });

  describe('checkbox', () => {
    it('renders a checkbox per row and cascades a folder check to its children', async () => {
      const { wrapper, checkedIdsRef, clickCheckbox } = makeWrapper({ selectionMode: 'checkbox' });
      expect(wrapper.findAll('.coar-tree-node__checkbox').length).toBe(6);
      await clickCheckbox('a');
      expect([...checkedIdsRef.value].sort()).toEqual(['a', 'a1', 'a2']);
      expect(wrapper.find('[data-node-id="a"]').attributes('aria-checked')).toBe('true');
    });

    it('marks a partially-checked parent indeterminate (aria-checked=mixed)', async () => {
      const { wrapper, checkedIdsRef, clickCheckbox } = makeWrapper({ selectionMode: 'checkbox' });
      await clickCheckbox('a1');
      expect(checkedIdsRef.value.has('a1')).toBe(true);
      expect(checkedIdsRef.value.has('a')).toBe(false);
      expect(wrapper.find('[data-node-id="a"]').attributes('aria-checked')).toBe('mixed');
    });

    it('drops the parent when a child is unchecked', async () => {
      const { checkedIdsRef, clickCheckbox } = makeWrapper({ selectionMode: 'checkbox' });
      await clickCheckbox('a'); // a,a1,a2
      await clickCheckbox('a1'); // remove a1 → a drops
      expect([...checkedIdsRef.value]).toEqual(['a2']);
    });

    it('checkStrictly disables cascade', async () => {
      const { checkedIdsRef, clickCheckbox } = makeWrapper({
        selectionMode: 'checkbox',
        checkStrictly: true,
      });
      await clickCheckbox('a');
      expect([...checkedIdsRef.value]).toEqual(['a']);
    });

    it('clicking the row body highlights without checking', async () => {
      const { selectedIdsRef, checkedIdsRef, clickRow } = makeWrapper({ selectionMode: 'checkbox' });
      await clickRow('a1');
      expect([...selectedIdsRef.value]).toEqual(['a1']);
      expect(checkedIdsRef.value.size).toBe(0);
    });

    it('Space toggles the focused row checkbox', async () => {
      const { wrapper, checkedIdsRef, clickRow, keydown } = makeWrapper({ selectionMode: 'checkbox' });
      await clickRow('c'); // focus c
      await keydown({ key: ' ' });
      await nextTick();
      expect(checkedIdsRef.value.has('c')).toBe(true);
      expect(wrapper.find('[data-node-id="c"]').attributes('aria-checked')).toBe('true');
    });
  });
});
