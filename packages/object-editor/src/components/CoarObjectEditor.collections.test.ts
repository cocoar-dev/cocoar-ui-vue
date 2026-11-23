import { describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import CoarObjectEditor from './CoarObjectEditor.vue';
import type { JsonObject, JsonSchema } from '../core/schema';

const row = (wrapper: VueWrapper, pointer: string) => wrapper.find(`[data-pointer="${pointer}"]`);
const pointers = (wrapper: VueWrapper) => wrapper.findAll('[data-pointer]').map((element) => element.attributes('data-pointer'));
const rowOf = (wrapper: VueWrapper, pointer: string) =>
  wrapper.findAllComponents({ name: 'ObjectEditorRow' }).find((c) => c.props('row').pointer === pointer)!;

function mountEditor(schema: JsonSchema, value: JsonObject | undefined, extra: Record<string, unknown> = {}) {
  const model = ref(value);
  const search = ref((extra.search as string) ?? '');
  const editor = ref<{ focus: (pointer: string) => Promise<boolean> }>();
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(CoarObjectEditor, {
          ref: editor,
          schema,
          modelValue: model.value,
          'onUpdate:modelValue': (next: JsonObject | undefined) => (model.value = next),
          search: search.value,
          'onUpdate:search': (next: string) => (search.value = next),
          ...extra,
        }),
    }),
    { attachTo: document.body },
  );
  return { wrapper, model, search, editor };
}

const schema: JsonSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', title: 'Name' },
    servers: { type: 'array', title: 'Servers', items: { type: 'string' } },
    flags: { type: 'array', title: 'Flags', items: { type: 'boolean' } },
    limits: { type: 'object', title: 'Limits', additionalProperties: { type: 'integer', minimum: 0 } },
    network: {
      type: 'object',
      title: 'Network',
      properties: { proxy: { type: 'object', title: 'Proxy', properties: { port: { type: 'integer', title: 'Port' } } } },
    },
  },
};

describe('ordered lists (#90)', () => {
  it('shows one row per item, keeping order, duplicates, false and 0', () => {
    const { wrapper } = mountEditor(schema, { servers: ['a', 'b', 'a'], flags: [false, true] });
    expect(pointers(wrapper)).toEqual(expect.arrayContaining(['/servers/0', '/servers/1', '/servers/2', '/flags/0', '/flags/1']));
    expect(row(wrapper, '/servers').text()).toContain('3 items');
    wrapper.unmount();
  });

  it('adds, inserts, moves and removes items', async () => {
    const { wrapper, model } = mountEditor(schema, { servers: ['a', 'b'] });
    rowOf(wrapper, '/servers').vm.$emit('add');
    await nextTick();
    expect(model.value).toEqual({ servers: ['a', 'b', ''] });
    rowOf(wrapper, '/servers/0').vm.$emit('insert');
    await nextTick();
    expect(model.value).toEqual({ servers: ['a', '', 'b', ''] });
    rowOf(wrapper, '/servers/2').vm.$emit('move', -1);
    await nextTick();
    expect(model.value).toEqual({ servers: ['a', 'b', '', ''] });
    rowOf(wrapper, '/servers/3').vm.$emit('remove');
    await nextTick();
    expect(model.value).toEqual({ servers: ['a', 'b', ''] });
    wrapper.unmount();
  });

  it('keeps an emptied item in its place with presence filled', async () => {
    const { wrapper, model } = mountEditor(schema, { servers: ['a', 'b'] }, { presence: 'filled' });
    await row(wrapper, '/servers/0').find('input').setValue('');
    expect(model.value).toEqual({ servers: ['', 'b'] });
    wrapper.unmount();
  });

  it('moves an item with Alt+ArrowDown', async () => {
    const { wrapper, model } = mountEditor(schema, { servers: ['a', 'b'] });
    await row(wrapper, '/servers/0').trigger('keydown', { key: 'ArrowDown', altKey: true });
    expect(model.value).toEqual({ servers: ['b', 'a'] });
    wrapper.unmount();
  });

  it('edits an item of an inherited list by copying the list into the document', async () => {
    const { wrapper, model } = mountEditor(schema, {}, { base: { servers: ['base-a', 'base-b'] } });
    rowOf(wrapper, '/servers/1').vm.$emit('update:value', 'mine');
    await nextTick();
    expect(model.value).toEqual({ servers: ['base-a', 'mine'] });
    wrapper.unmount();
  });
});

describe('typed maps (#90)', () => {
  it('adds, renames and deletes keys, refusing a key that exists', async () => {
    const { wrapper, model } = mountEditor(schema, { limits: { cpu: 2, ram: 4 } });
    rowOf(wrapper, '/limits').vm.$emit('add');
    await nextTick();
    expect(model.value).toEqual({ limits: { cpu: 2, ram: 4, key: 0 } });
    rowOf(wrapper, '/limits/key').vm.$emit('rename', 'cpu');
    await nextTick();
    expect(model.value).toEqual({ limits: { cpu: 2, ram: 4, key: 0 } });
    expect(row(wrapper, '/limits/key').text()).toContain('This key exists already.');
    rowOf(wrapper, '/limits/key').vm.$emit('rename', 'key');
    await nextTick();
    expect(row(wrapper, '/limits/key').text()).not.toContain('This key exists already.');
    rowOf(wrapper, '/limits/key').vm.$emit('rename', 'disk');
    await nextTick();
    expect(Object.keys(model.value!.limits as object)).toEqual(['cpu', 'ram', 'disk']);
    rowOf(wrapper, '/limits/cpu').vm.$emit('remove');
    await nextTick();
    expect(model.value).toEqual({ limits: { ram: 4, disk: 0 } });
    wrapper.unmount();
  });

  it('reports a problem at the entry it belongs to', () => {
    const { wrapper } = mountEditor(schema, { limits: { cpu: -1 } });
    expect(row(wrapper, '/limits/cpu').find('.coar-object-editor-error').text()).toBe('At least 0.');
    wrapper.unmount();
  });
});

describe('search (#91)', () => {
  it('finds rows by title, key or path under closed groups, and restores them when cleared', async () => {
    const { wrapper, search } = mountEditor(schema, {});
    await rowOf(wrapper, '/network').vm.$emit('toggle');
    await nextTick();
    expect(pointers(wrapper)).not.toContain('/network/proxy/port');

    search.value = 'port';
    await nextTick();
    expect(pointers(wrapper)).toEqual(['/network', '/network/proxy', '/network/proxy/port']);
    search.value = 'network.proxy';
    await nextTick();
    expect(pointers(wrapper)).toEqual(['/network', '/network/proxy', '/network/proxy/port']);

    search.value = '';
    await nextTick();
    expect(pointers(wrapper)).not.toContain('/network/proxy/port');
    wrapper.unmount();
  });

  it('never matches values', async () => {
    const { wrapper, search } = mountEditor(schema, { name: 'findme' });
    search.value = 'findme';
    await nextTick();
    expect(pointers(wrapper)).toEqual([]);
    wrapper.unmount();
  });

  it('focus() opens the groups of a row and focuses its control', async () => {
    const { wrapper, editor } = mountEditor(schema, {});
    await rowOf(wrapper, '/network').vm.$emit('toggle');
    await nextTick();
    expect(await editor.value!.focus('/network/proxy/port')).toBe(true);
    expect(document.activeElement?.closest('[data-pointer]')?.getAttribute('data-pointer')).toBe('/network/proxy/port');
    wrapper.unmount();
  });
});
