import { describe, it, expect, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref, type Component } from 'vue';
import CoarTreeRaw from './CoarTree.vue';
import CoarTreeNodeLabel from './CoarTreeNodeLabel.vue';
import { useTree } from './useTree';
import type { CoarTreeCreateEvent } from './tree-types';

const CoarTree = CoarTreeRaw as Component;

interface DemoNode {
  id: string;
  name: string;
  children?: DemoNode[];
}
const demoTree: DemoNode[] = [
  { id: 'a', name: 'Alpha', children: [{ id: 'a1', name: 'A-1' }] },
  { id: 'b', name: 'Beta' },
];

// startCreate (like startRename) mounts the input on the next animation frame.
const rafFlush = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

// Trees attach to document.body for real focus behaviour; unmount them between
// tests so a lingering focused draft input can't fight the next test's input
// for focus (the blur-grace re-focus would ping-pong across both mounted trees).
const mounted: VueWrapper[] = [];
afterEach(() => {
  for (const w of mounted.splice(0)) w.unmount();
});

function makeWrapper() {
  const { builder, api } = useTree<DemoNode>();
  const created: CoarTreeCreateEvent[] = [];
  let cancelled = 0;
  const expanded = ref(new Set<string>());
  builder
    .nodes(demoTree)
    .getId((n) => n.id)
    .getChildren((n) => n.children)
    .getLabel((n) => n.name)
    .expanded(expanded)
    .creatable(true)
    .onCreate((e) => created.push(e))
    .onCreateCancel(() => {
      cancelled += 1;
    });

  const Wrapper = defineComponent({
    setup: () => () =>
      h(CoarTree, { builder }, { default: ({ node }: { node: DemoNode }) => h(CoarTreeNodeLabel, { label: node.name }) }),
  });
  const wrapper = mount(Wrapper, { attachTo: document.body });
  mounted.push(wrapper);
  const input = () => wrapper.find('input.coar-tree__draft-input');
  return { wrapper, api, created, expanded, input, getCancelled: () => cancelled };
}

describe('CoarTree inline create', () => {
  it('api.startCreate opens a draft and Enter fires create with parentId + name + kind', async () => {
    const { api, created, input } = makeWrapper();
    await nextTick();
    api.startCreate('a', { kind: 'folder' });
    await rafFlush();
    await nextTick();
    expect(input().exists()).toBe(true);
    await input().setValue('New folder');
    await input().trigger('keydown', { key: 'Enter' });
    expect(created.at(-1)).toEqual({ parentId: 'a', name: 'New folder', kind: 'folder' });
    // Draft is dropped after commit.
    await nextTick();
    expect(input().exists()).toBe(false);
  });

  it('Escape cancels without creating', async () => {
    const { api, created, input, getCancelled } = makeWrapper();
    await nextTick();
    api.startCreate('a');
    await rafFlush();
    await nextTick();
    await input().setValue('Nope');
    await input().trigger('keydown', { key: 'Escape' });
    expect(created).toHaveLength(0);
    expect(getCancelled()).toBe(1);
  });

  it('an empty name commits as a cancel', async () => {
    const { api, created, input, getCancelled } = makeWrapper();
    await nextTick();
    api.startCreate('a');
    await rafFlush();
    await nextTick();
    await input().setValue('   ');
    await input().trigger('keydown', { key: 'Enter' });
    expect(created).toHaveLength(0);
    expect(getCancelled()).toBe(1);
  });

  it('startCreate auto-expands the parent so the draft renders nested', async () => {
    const { api, expanded, input } = makeWrapper();
    await nextTick();
    expect(expanded.value.has('a')).toBe(false);
    api.startCreate('a');
    await rafFlush();
    await nextTick();
    expect(expanded.value.has('a')).toBe(true);
    expect(input().exists()).toBe(true);
  });

  it('kind defaults to folder and root create uses parentId null', async () => {
    const { api, created, input } = makeWrapper();
    await nextTick();
    api.startCreate(null); // root, default kind
    await rafFlush();
    await nextTick();
    await input().setValue('RootFolder');
    await input().trigger('keydown', { key: 'Enter' });
    expect(created.at(-1)).toEqual({ parentId: null, name: 'RootFolder', kind: 'folder' });
  });

  it('a leaf kind is echoed back on create', async () => {
    const { api, created, input } = makeWrapper();
    await nextTick();
    api.startCreate('a', { kind: 'leaf' });
    await rafFlush();
    await nextTick();
    await input().setValue('file.txt');
    await input().trigger('keydown', { key: 'Enter' });
    expect(created.at(-1)).toEqual({ parentId: 'a', name: 'file.txt', kind: 'leaf' });
  });
});
