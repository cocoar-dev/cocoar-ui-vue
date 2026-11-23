import { describe, expect, it } from 'vitest';
import { defineComponent, h, markRaw, nextTick, ref } from 'vue';
import { mount } from '@vue/test-utils';
import CoarObjectEditor from './CoarObjectEditor.vue';
import { buildRows } from './rows';
import { defineObjectEditorTypes } from '../types/builtins';
import type { JsonObject, JsonSchema } from '../core/schema';
import type { CoarValueType } from '../types/types';

const schema: JsonSchema = {
  type: 'object',
  required: ['name'],
  properties: {
    name: { type: 'string', title: 'Name', 'x-coar-type': 'text' },
    stock: { type: 'integer', title: 'Stock', minimum: 0 },
    category: { title: 'Category', oneOf: [{ const: 'a', title: 'Lighting' }] },
    owner: { type: 'string', title: 'Owner', 'x-coar-options': 'people' },
    dimensions: {
      type: 'object',
      title: 'Dimensions',
      properties: { width: { type: 'number', title: 'Width', maximum: 100, 'x-coar-unit': 'cm' } },
    },
    contacts: { type: 'array', title: 'Contacts', items: { type: 'object', properties: { name: { type: 'string' } } } },
  },
};

function mountEditor(value: JsonObject | undefined, extra: Record<string, unknown> = {}) {
  const model = ref(value);
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(CoarObjectEditor, {
          schema,
          modelValue: model.value,
          'onUpdate:modelValue': (next: JsonObject | undefined) => (model.value = next),
          ...extra,
        }),
    }),
    { attachTo: document.body },
  );
  return { wrapper, model };
}

const row = (wrapper: ReturnType<typeof mount>, pointer: string) => wrapper.find(`[data-pointer="${pointer}"]`);

describe('buildRows', () => {
  it('lists properties in order, nested rows below their object, and unknown values last', () => {
    const rows = buildRows(schema, { name: 'Lamp', extra: 1 }, defineObjectEditorTypes(), { people: [] }, new Set());
    expect(rows.map((r) => r.pointer)).toEqual([
      '/name', '/stock', '/category', '/owner', '/dimensions', '/dimensions/width', '/contacts', '/extra',
    ]);
    expect(rows.find((r) => r.pointer === '/contacts')!.typeId).toBe('group-list');
    expect(rows.find((r) => r.pointer === '/extra')!.extra).toBe(true);
    expect(buildRows(schema, {}, defineObjectEditorTypes(), {}, new Set(['/dimensions'])).map((r) => r.pointer)).not.toContain('/dimensions/width');
  });
});

describe('buildRows with a recursive definition (#93)', () => {
  const recursive: JsonSchema = {
    type: 'object',
    properties: { head: { $ref: '#/$defs/node' } },
    $defs: { node: { type: 'object', properties: { label: { type: 'string' }, next: { $ref: '#/$defs/node' } } } },
  };

  it('builds a finite list: the repeated definition starts closed', () => {
    const rows = buildRows(recursive, {}, defineObjectEditorTypes(), {}, new Set());
    expect(rows.map((r) => r.pointer)).toEqual(['/head', '/head/label', '/head/next']);
    const next = rows.find((r) => r.pointer === '/head/next')!;
    expect(next).toMatchObject({ nested: true, recursive: true, collapsed: true });
  });

  it('opens recursive groups that hold data when every value must be seen', () => {
    const value = { head: { next: { next: {} } } };
    const pointers = buildRows(recursive, value, defineObjectEditorTypes(), {}, new Set(), { allWithData: true }).map((r) => r.pointer);
    expect(pointers).toContain('/head/next/next/label');
    expect(pointers).not.toContain('/head/next/next/next/label');
  });

  it('runs the check of an app type inside recursive data', async () => {
    const shout: CoarValueType<string> = {
      id: 'shout',
      label: 'Shout',
      icon: 'type',
      schema: { type: 'string' },
      control: markRaw(defineComponent({ setup: () => () => h('span') })),
      validate: (value) => (value === value.toUpperCase() ? null : 'Use capitals.'),
    };
    const schema: JsonSchema = {
      ...recursive,
      $defs: { node: { type: 'object', properties: { label: { type: 'string', 'x-coar-type': 'shout' }, next: { $ref: '#/$defs/node' } } } },
    };
    const editor = ref<InstanceType<typeof CoarObjectEditor>>();
    const wrapper = mount(() =>
      h(CoarObjectEditor, { ref: editor, schema, types: defineObjectEditorTypes([shout]), modelValue: { head: { next: { label: 'quiet' } } } }),
    );
    expect(editor.value!.issues).toEqual([{ pointer: '/head/next/label', keyword: 'custom', message: 'Use capitals.' }]);
    wrapper.unmount();
  });

  it('opens one level per toggle', () => {
    const rows = buildRows(recursive, {}, defineObjectEditorTypes(), {}, new Set(['/head/next']));
    expect(rows.map((r) => r.pointer)).toEqual(['/head', '/head/label', '/head/next', '/head/next/label', '/head/next/next']);
    expect(rows.at(-1)!.collapsed).toBe(true);
  });
});

describe('CoarObjectEditor', () => {
  it('writes a typed value at its path and keeps an emptied text as "" (#86)', async () => {
    const { wrapper, model } = mountEditor({ name: 'Lamp' });
    const input = row(wrapper, '/name').find('input');
    await input.setValue('Desk lamp');
    expect(model.value).toEqual({ name: 'Desk lamp' });
    await input.setValue('');
    expect(model.value).toEqual({ name: '' });
    expect(row(wrapper, '/name').find('.coar-object-editor-literal').text()).toBe('""');
    wrapper.unmount();
  });

  it('removes an emptied value with presence filled, as forms do', async () => {
    const { wrapper, model } = mountEditor({ name: 'Lamp' }, { presence: 'filled' });
    await row(wrapper, '/name').find('input').setValue('');
    expect(model.value).toEqual({});
    expect(row(wrapper, '/name').find('.coar-object-editor-error').text()).toBe('Required.');
    wrapper.unmount();
  });

  it('shows the problems of the schema in the row they belong to', async () => {
    const { wrapper } = mountEditor({ stock: -1, dimensions: { width: 120 } });
    expect(row(wrapper, '/name').find('.coar-object-editor-error').text()).toBe('Required.');
    expect(row(wrapper, '/stock').find('.coar-object-editor-error').text()).toBe('At least 0.');
    expect(row(wrapper, '/dimensions/width').find('.coar-object-editor-error').text()).toBe('At most 100.');
    wrapper.unmount();
  });

  it('keeps lists of objects and unknown values read-only and unchanged', async () => {
    const value = { name: 'Lamp', contacts: [{ name: 'Anna' }], legacy: { kept: true } };
    const { wrapper, model } = mountEditor(value);
    expect(row(wrapper, '/contacts').find('input').exists()).toBe(false);
    expect(row(wrapper, '/contacts').text()).toContain('1 entry');
    expect(row(wrapper, '/legacy').text()).toContain('not in the schema');
    await row(wrapper, '/name').find('input').setValue('Desk lamp');
    expect(model.value).toEqual({ ...value, name: 'Desk lamp' });
    wrapper.unmount();
  });

  it('puts rows on one background unless striped', () => {
    const plain = mountEditor({});
    expect(plain.wrapper.find('.coar-object-editor').classes()).not.toContain('coar-object-editor--striped');
    plain.wrapper.unmount();
    const striped = mountEditor({}, { striped: true });
    expect(striped.wrapper.find('.coar-object-editor').classes()).toContain('coar-object-editor--striped');
    striped.wrapper.unmount();
  });

  it('marks an open group, whose guide starts under its chevron', async () => {
    const { wrapper } = mountEditor({});
    expect(row(wrapper, '/dimensions').classes()).toContain('coar-object-editor-row--open');
    expect(row(wrapper, '/dimensions/width').classes()).toContain('coar-object-editor-row--nested');
    await row(wrapper, '/dimensions').find('button').trigger('click');
    expect(row(wrapper, '/dimensions').classes()).not.toContain('coar-object-editor-row--open');
    wrapper.unmount();
  });

  it('shows a required key without a row at the nearest row, or above the rows (#92)', () => {
    const loose: JsonSchema = {
      type: 'object',
      required: ['flag'],
      properties: { settings: { type: 'object', title: 'Settings', required: ['mode'], properties: { other: { type: 'string' } } } },
    };
    const wrapper = mount(() => h(CoarObjectEditor, { schema: loose, modelValue: { settings: {} } }));
    expect(wrapper.find('.coar-object-editor-issues').text()).toBe('flag: Required.');
    expect(row(wrapper, '/settings').find('.coar-object-editor-error').text()).toBe('mode: Required.');
    wrapper.unmount();
  });

  it('shows null, "", [] and {} as values and a missing key as not set (#86)', () => {
    const nullable: JsonSchema = {
      type: 'object',
      properties: {
        flag: { type: ['boolean', 'null'], title: 'Flag' },
        name: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        group: { type: 'object', properties: { a: { type: 'string' } } },
        missing: { type: 'string' },
      },
    };
    const wrapper = mount(() =>
      h(CoarObjectEditor, { schema: nullable, mode: 'view', modelValue: { flag: null, name: '', tags: [], group: {} } }),
    );
    expect(row(wrapper, '/flag').find('.coar-object-editor-literal').text()).toBe('null');
    expect(row(wrapper, '/flag').attributes('data-state')).toBe('local');
    expect(row(wrapper, '/tags').text()).toContain('[]');
    expect(row(wrapper, '/group').text()).toContain('{}');
    expect(row(wrapper, '/missing').attributes('data-state')).toBe('absent');
    expect(row(wrapper, '/missing').find('.coar-object-editor-literal').exists()).toBe(false);
    wrapper.unmount();
  });

  it('writes null for an emptied value the schema lets be null, and keeps the value otherwise (#86)', async () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: { a: { type: ['number', 'null'] }, b: { type: 'number' } },
    };
    const model = ref<JsonObject | undefined>({ a: 1, b: 2 });
    const wrapper = mount(
      () => h(CoarObjectEditor, { schema, modelValue: model.value, 'onUpdate:modelValue': (next: JsonObject | undefined) => (model.value = next) }),
      { attachTo: document.body },
    );
    const control = (pointer: string) => wrapper.findAllComponents({ name: 'NumberControl' }).find((c) => c.props('id').endsWith(pointer))!;
    control('/a').vm.$emit('update:modelValue', undefined);
    await nextTick();
    expect(model.value).toEqual({ a: null, b: 2 });
    control('/b').vm.$emit('update:modelValue', undefined);
    await nextTick();
    expect(model.value).toEqual({ a: null, b: 2 });
    expect(row(wrapper, '/b').find('.coar-object-editor-hint').exists()).toBe(true);
    wrapper.unmount();
  });

  it('removes a key only through Remove, and offers Set to null where allowed (#86)', async () => {
    const schema: JsonSchema = { type: 'object', properties: { flag: { type: ['boolean', 'null'] } } };
    const model = ref<JsonObject | undefined>({ flag: false });
    const wrapper = mount(
      () => h(CoarObjectEditor, { schema, modelValue: model.value, 'onUpdate:modelValue': (next: JsonObject | undefined) => (model.value = next) }),
      { attachTo: document.body },
    );
    const rowComponent = () => wrapper.findComponent({ name: 'ObjectEditorRow' });
    rowComponent().vm.$emit('update:value', null);
    await nextTick();
    expect(model.value).toEqual({ flag: null });
    rowComponent().vm.$emit('remove');
    await nextTick();
    expect(model.value).toEqual({});
    wrapper.unmount();
  });

  it('collapses a group', async () => {
    const { wrapper } = mountEditor({});
    expect(row(wrapper, '/dimensions/width').exists()).toBe(true);
    await row(wrapper, '/dimensions').find('button').trigger('click');
    expect(row(wrapper, '/dimensions/width').exists()).toBe(false);
    wrapper.unmount();
  });

  it('shows formatted values in view mode', async () => {
    const { wrapper } = mountEditor(
      { name: 'Lamp', stock: 42, category: 'a', owner: 'u1', dimensions: { width: 18 } },
      { mode: 'view', locale: 'en-US', optionSources: { people: () => Promise.resolve([{ value: 'u1', label: 'Anna Berger' }]) } },
    );
    await new Promise((resolve) => setTimeout(resolve));
    expect(row(wrapper, '/stock').text()).toContain('42');
    expect(row(wrapper, '/category').text()).toContain('Lighting');
    expect(row(wrapper, '/owner').text()).toContain('Anna Berger');
    expect(row(wrapper, '/dimensions/width').text()).toContain('18.00 cm');
    expect(row(wrapper, '/name').find('input').attributes('readonly')).toBeDefined();
    wrapper.unmount();
  });

  it('edits an app type with its own control and runs its check', async () => {
    const MoneyControl = markRaw(
      defineComponent({
        props: ['modelValue'],
        emits: ['update:modelValue'],
        setup: (props, { emit }) => () =>
          h('button', { class: 'money', onClick: () => emit('update:modelValue', { amount: 5 }) }, 'set'),
      }),
    );
    const money: CoarValueType<{ amount?: number; currency?: string }> = {
      id: 'money',
      label: 'Money',
      icon: 'hash',
      schema: { type: 'object', properties: { amount: { type: 'number' }, currency: { type: 'string' } } },
      control: MoneyControl,
      validate: (value) => (value.currency ? null : 'Pick a currency.'),
    };
    const moneySchema: JsonSchema = {
      type: 'object',
      properties: { price: { $ref: '#/$defs/money', title: 'Price', 'x-coar-type': 'money' } },
      $defs: { money: money.schema },
    };
    const model = ref<JsonObject | undefined>({});
    const wrapper = mount(() =>
      h(CoarObjectEditor, {
        schema: moneySchema,
        types: defineObjectEditorTypes([money]),
        modelValue: model.value,
        'onUpdate:modelValue': (next: JsonObject | undefined) => (model.value = next),
      }),
    );
    await wrapper.find('.money').trigger('click');
    expect(model.value).toEqual({ price: { amount: 5 } });
    expect(row(wrapper, '/price').find('.coar-object-editor-error').text()).toBe('Pick a currency.');
    expect(row(wrapper, '/price/amount').exists()).toBe(false);
    wrapper.unmount();
  });
});
