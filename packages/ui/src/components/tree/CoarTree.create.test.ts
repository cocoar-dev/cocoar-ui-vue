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

function makeWrapper(opts: { onCreate?: (e: CoarTreeCreateEvent) => unknown } = {}) {
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
    .onCreate((e) => {
      created.push(e);
      return opts.onCreate?.(e);
    })
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

  // ── async keep-open + retry (Tellify reply #A) ──────────────────────────
  it('an async onCreate keeps the draft open + name until it settles, reopening on reject', async () => {
    let reject!: () => void;
    const { api, input } = makeWrapper({
      onCreate: () => new Promise<void>((_res, rej) => (reject = rej)),
    });
    await nextTick();
    api.startCreate('a');
    await rafFlush();
    await nextTick();
    await input().setValue('dup-name');
    await input().trigger('keydown', { key: 'Enter' });
    await nextTick();
    // Pending: draft stays mounted with the typed name (not dropped on Enter).
    expect(input().exists()).toBe(true);
    expect((input().element as HTMLInputElement).value).toBe('dup-name');
    // Reject (e.g. duplicate-name 409): draft stays open so the user can retry.
    reject();
    await nextTick();
    await nextTick();
    expect(input().exists()).toBe(true);
    expect((input().element as HTMLInputElement).value).toBe('dup-name');
  });

  it('an async onCreate drops the draft on success', async () => {
    let resolve!: () => void;
    const { api, input } = makeWrapper({
      onCreate: () => new Promise<void>((res) => (resolve = res)),
    });
    await nextTick();
    api.startCreate('a');
    await rafFlush();
    await nextTick();
    await input().setValue('ok');
    await input().trigger('keydown', { key: 'Enter' });
    await nextTick();
    expect(input().exists()).toBe(true); // pending
    resolve();
    await nextTick();
    await nextTick();
    expect(input().exists()).toBe(false); // dropped on success
  });

  it('re-calling startCreate from the create handler reopens the draft with the name (event-form retry)', async () => {
    // Mirrors the prop/event-form pattern: on a rejected @create, the consumer
    // re-opens imperatively with the typed name preserved.
    const holder: { api?: ReturnType<typeof useTree<DemoNode>>['api'] } = {};
    const { api, input } = makeWrapper({
      onCreate: (e) => holder.api?.startCreate(e.parentId, { initialName: e.name }),
    });
    holder.api = api;
    await nextTick();
    api.startCreate('a');
    await rafFlush();
    await nextTick();
    await input().setValue('retry-me');
    await input().trigger('keydown', { key: 'Enter' });
    // Handler re-opened via startCreate (rAF-scheduled); flush it.
    await rafFlush();
    await nextTick();
    expect(input().exists()).toBe(true);
    expect((input().element as HTMLInputElement).value).toBe('retry-me');
  });

  // ── prop-form (no useTree / builder) — Tellify reply #B ──────────────────
  it('prop-form: creatable + @create + template-ref startCreate work without a builder', async () => {
    const created: CoarTreeCreateEvent[] = [];
    const treeRef = ref<{ startCreate: (p: string | null, o?: { kind?: 'folder' | 'leaf' }) => void } | null>(null);
    const expanded = ref(new Set<string>());
    const Wrapper = defineComponent({
      setup: () => () =>
        h(
          CoarTree,
          {
            ref: treeRef,
            nodes: demoTree,
            getId: (n: DemoNode) => n.id,
            getChildren: (n: DemoNode) => n.children,
            getLabel: (n: DemoNode) => n.name,
            creatable: true,
            expanded: expanded.value,
            'onUpdate:expanded': (v: Set<string>) => (expanded.value = v),
            onCreate: (e: CoarTreeCreateEvent) => created.push(e),
          },
          { default: ({ node }: { node: DemoNode }) => h(CoarTreeNodeLabel, { label: node.name }) },
        ),
    });
    const wrapper = mount(Wrapper, { attachTo: document.body });
    mounted.push(wrapper);
    await nextTick();
    // Imperative entry via the COMPONENT template ref (not useTree().api).
    treeRef.value!.startCreate('a', { kind: 'folder' });
    await rafFlush();
    await nextTick();
    const input = wrapper.find('input.coar-tree__draft-input');
    expect(input.exists()).toBe(true);
    await input.setValue('PropFolder');
    await input.trigger('keydown', { key: 'Enter' });
    expect(created.at(-1)).toEqual({ parentId: 'a', name: 'PropFolder', kind: 'folder' });
  });
});
