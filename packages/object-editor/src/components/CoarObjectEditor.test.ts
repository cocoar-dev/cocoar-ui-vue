import { describe, expect, it } from 'vitest';
import { defineComponent, h, markRaw, ref } from 'vue';
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
    expect(rows.find((r) => r.pointer === '/contacts')!.typeId).toBe('list');
    expect(rows.find((r) => r.pointer === '/extra')!.extra).toBe(true);
    expect(buildRows(schema, {}, defineObjectEditorTypes(), {}, new Set(['/dimensions'])).map((r) => r.pointer)).not.toContain('/dimensions/width');
  });
});

describe('CoarObjectEditor', () => {
  it('writes a typed value at its path and removes a cleared one', async () => {
    const { wrapper, model } = mountEditor({ name: 'Lamp' });
    const input = row(wrapper, '/name').find('input');
    await input.setValue('Desk lamp');
    expect(model.value).toEqual({ name: 'Desk lamp' });
    await input.setValue('');
    expect(model.value).toEqual({});
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
