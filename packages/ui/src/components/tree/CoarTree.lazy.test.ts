import { describe, it, expect } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref, type Component } from 'vue';
import CoarTreeRaw from './CoarTree.vue';
import { useTree } from './useTree';

const CoarTree = CoarTreeRaw as Component;

interface LazyNode {
  id: string;
  name: string;
  children?: LazyNode[];
}

interface Deferred {
  resolve: () => void;
  reject: (e: unknown) => void;
  promise: Promise<void>;
}
function deferred(): Deferred {
  let resolve!: () => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = () => res();
    reject = rej;
  });
  return { resolve, reject, promise };
}

function makeWrapper(opts: { maxConcurrentLoads?: number } = {}) {
  const roots = ref<LazyNode[]>([
    { id: 'f1', name: 'F1' },
    { id: 'f2', name: 'F2' },
    { id: 'f3', name: 'F3' },
  ]);
  const expanded = ref(new Set<string>());
  const calls: { id: string; signal: AbortSignal; deferred: Deferred }[] = [];
  const errors: string[] = [];

  const { builder, api } = useTree<LazyNode>();
  builder
    .nodes(roots)
    .getId((n) => n.id)
    .getChildren((n) => n.children) // undefined until loaded
    .getLabel((n) => n.name)
    .isExpandable(() => true) // all are lazy folders
    .expanded(expanded)
    .maxConcurrentLoads(opts.maxConcurrentLoads ?? 0)
    .loadChildren((node, ctx) => {
      const d = deferred();
      calls.push({ id: node.id, signal: ctx.signal, deferred: d });
      return d.promise;
    })
    .onLoadError((e) => errors.push((e.node as LazyNode).id));

  const Wrapper = defineComponent({
    setup: () => () =>
      h(CoarTree, { builder }, { default: ({ node }: { node: LazyNode }) => h('span', null, node.name) }),
  });
  const wrapper = mount(Wrapper, { attachTo: document.body });
  return { wrapper, api, roots, expanded, calls, errors };
}

describe('CoarTree lazy hardening', () => {
  it('passes an AbortSignal and aborts it when the folder collapses mid-flight', async () => {
    const { expanded, calls } = makeWrapper();
    expanded.value = new Set(['f1']);
    await nextTick();
    expect(calls).toHaveLength(1);
    expect(calls[0].id).toBe('f1');
    expect(calls[0].signal.aborted).toBe(false);

    expanded.value = new Set(); // collapse mid-flight
    await nextTick();
    expect(calls[0].signal.aborted).toBe(true);
  });

  it('suppresses a rejection from an aborted (collapsed) load — no error surfaced', async () => {
    const { expanded, calls, errors } = makeWrapper();
    expanded.value = new Set(['f1']);
    await nextTick();
    expanded.value = new Set(); // collapse → abort
    await nextTick();
    calls[0].deferred.reject(new Error('stale'));
    await flushPromises();
    expect(errors).toHaveLength(0);
  });

  it('caps in-flight loads at maxConcurrentLoads and pumps the queue on settle', async () => {
    const { expanded, calls } = makeWrapper({ maxConcurrentLoads: 2 });
    expanded.value = new Set(['f1', 'f2', 'f3']);
    await nextTick();
    expect(calls).toHaveLength(2); // f3 queued

    calls[0].deferred.resolve();
    await flushPromises();
    await nextTick();
    expect(calls).toHaveLength(3); // queue pumped → f3 starts
  });

  it('surfaces an error when the load rejects while still expanded', async () => {
    const { expanded, calls, errors } = makeWrapper();
    expanded.value = new Set(['f1']);
    await nextTick();
    calls[0].deferred.reject(new Error('boom'));
    await flushPromises();
    expect(errors).toEqual(['f1']);
  });

  it('shows a built-in retry affordance on error and reloads when clicked', async () => {
    const { wrapper, expanded, calls } = makeWrapper();
    expanded.value = new Set(['f1']);
    await nextTick();
    calls[0].deferred.reject(new Error('boom'));
    await flushPromises();
    await nextTick();
    const chevron = wrapper.find('[data-node-id="f1"] .coar-tree-node__chevron');
    expect(chevron.classes()).toContain('coar-tree-node__chevron--error');
    expect(chevron.attributes('aria-label')).toBe('Retry');
    await chevron.trigger('click');
    await nextTick();
    expect(calls).toHaveLength(2); // reload triggered
  });
});
