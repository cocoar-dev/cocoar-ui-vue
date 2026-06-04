import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref, type Component } from 'vue';
import CoarTreeRaw from './CoarTree.vue';
import CoarTreeNodeLabel from './CoarTreeNodeLabel.vue';
import { useTree } from './useTree';

const CoarTree = CoarTreeRaw as Component;

interface DemoNode {
  id: string;
  name: string;
  children?: DemoNode[];
}
const demoTree: DemoNode[] = [
  { id: 'a', name: 'Alpha', children: [{ id: 'a1', name: 'A-1' }, { id: 'a2', name: 'A-2' }] },
];

const rafFlush = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

function makeWrapper() {
  const { builder, api } = useTree<DemoNode>();
  const renamed: { node: DemoNode; newName: string }[] = [];
  const cancelled: DemoNode[] = [];
  const expanded = ref(new Set<string>(['a']));
  builder
    .nodes(demoTree)
    .getId((n) => n.id)
    .getChildren((n) => n.children)
    .getLabel((n) => n.name)
    .expanded(expanded)
    .renamable(true)
    .onRename((e) => renamed.push(e))
    .onRenameCancel((n) => cancelled.push(n));

  const Wrapper = defineComponent({
    setup: () => () =>
      h(CoarTree, { builder }, { default: ({ node }: { node: DemoNode }) => h(CoarTreeNodeLabel, { label: node.name }) }),
  });
  const wrapper = mount(Wrapper, { attachTo: document.body });
  const input = () => wrapper.find('input.coar-tree-node-label__input');
  return { wrapper, api, renamed, cancelled, input };
}

describe('CoarTree inline rename', () => {
  it('api.startRename opens the input and commit on Enter fires onRename', async () => {
    const { api, renamed, input } = makeWrapper();
    await nextTick();
    api.startRename('a1'); // the recommended-path that used to be broken
    await rafFlush();
    await nextTick();
    expect(input().exists()).toBe(true);
    await input().setValue('Renamed');
    await input().trigger('keydown', { key: 'Enter' });
    expect(renamed.at(-1)?.node.id).toBe('a1');
    expect(renamed.at(-1)?.newName).toBe('Renamed');
  });

  it('Escape cancels without renaming', async () => {
    const { api, renamed, cancelled, input } = makeWrapper();
    await nextTick();
    api.startRename('a1');
    await rafFlush();
    await nextTick();
    await input().setValue('Nope');
    await input().trigger('keydown', { key: 'Escape' });
    expect(renamed).toHaveLength(0);
    expect(cancelled.at(-1)?.id).toBe('a1');
  });

  it('an empty name commits as a cancel', async () => {
    const { api, renamed, cancelled, input } = makeWrapper();
    await nextTick();
    api.startRename('a1');
    await rafFlush();
    await nextTick();
    await input().setValue('   ');
    await input().trigger('keydown', { key: 'Enter' });
    expect(renamed).toHaveLength(0);
    expect(cancelled.at(-1)?.id).toBe('a1');
  });

  it('F2 on the focused row starts a rename', async () => {
    const { wrapper, input } = makeWrapper();
    await nextTick();
    await wrapper.find('[data-node-id="a1"]').trigger('click'); // focus a1
    await wrapper.find('.coar-tree').trigger('keydown', { key: 'F2' });
    await rafFlush();
    await nextTick();
    expect(input().exists()).toBe(true);
    expect(input().attributes('data-rename-id')).toBe('a1');
  });
});
