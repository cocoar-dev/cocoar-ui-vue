import { describe, expect, it } from 'vitest';
import { h, nextTick, shallowRef, type Component } from 'vue';
import { mount } from '@vue/test-utils';
import CoarSchemaEditor from './CoarSchemaEditor.vue';
import { createObjectSchema, type JsonSchema } from '../core/schema';
import { orderedKeys } from '../core/resolve';

function mountEditor(initial: JsonSchema) {
  const schema = shallowRef(initial);
  const wrapper = mount(
    // Component: the generic props of the SFC make h() too deep for the type checker.
    () => h(CoarSchemaEditor as Component, { modelValue: schema.value, 'onUpdate:modelValue': (next: JsonSchema) => (schema.value = next) }),
    { attachTo: document.body },
  );
  return { wrapper, schema };
}

const start = (): JsonSchema => ({
  ...createObjectSchema(),
  properties: {
    name: { type: 'string', title: 'Name', 'x-coar-type': 'text' },
    dimensions: { type: 'object', title: 'Dimensions', 'x-coar-type': 'object', properties: {} },
    category: { title: 'Category', 'x-coar-type': 'choice', oneOf: [{ const: 'a', title: 'A' }] },
  },
  'x-coar-order': ['name', 'dimensions', 'category'],
});

const button = (wrapper: ReturnType<typeof mount>, text: string) =>
  wrapper.findAll('button').find((b) => b.text() === text || b.attributes('aria-label') === text)!;

describe('CoarSchemaEditor', () => {
  it('adds a property with the composer and selects it', async () => {
    const { wrapper, schema } = mountEditor(start());
    await button(wrapper, 'Add property').trigger('click');
    const key = wrapper.find('.coar-schema-editor-composer input');
    await key.setValue('stock');
    await key.trigger('keydown', { key: 'Enter' });
    expect(orderedKeys(schema.value)).toEqual(['name', 'dimensions', 'category', 'stock']);
    expect(schema.value.properties!.stock).toEqual({ type: 'string', 'x-coar-type': 'text' });
    expect(wrapper.find('.coar-schema-editor-item--selected').attributes('data-path')).toBe('stock');
    wrapper.unmount();
  });

  it('adds into a group and refuses a key that exists', async () => {
    const { wrapper, schema } = mountEditor(start());
    await button(wrapper, 'Add a property to Dimensions').trigger('click');
    const key = wrapper.find('.coar-schema-editor-composer input');
    await key.setValue('width');
    await key.trigger('keydown', { key: 'Enter' });
    expect(Object.keys(schema.value.properties!.dimensions.properties!)).toEqual(['width']);
    expect(wrapper.find('[data-path="dimensions/width"]').exists()).toBe(true);

    await button(wrapper, 'Add property').trigger('click');
    await wrapper.find('.coar-schema-editor-composer input').setValue('name');
    expect(wrapper.find('.coar-schema-editor-composer').text()).toContain('This key exists already.');
    wrapper.unmount();
  });

  it('renames, makes required and edits the title of the selected property', async () => {
    const { wrapper, schema } = mountEditor(start());
    const inputs = () => wrapper.findAll('.coar-schema-editor-inspector input');
    await inputs()[0].setValue('productName');
    await inputs()[0].trigger('change');
    expect(orderedKeys(schema.value)[0]).toBe('productName');
    await wrapper.find('.coar-schema-editor-inspector [role="switch"], .coar-schema-editor-inspector input[type="checkbox"]').trigger('click');
    await nextTick();
    expect(schema.value.required).toEqual(['productName']);
    await inputs()[1].setValue('Product name');
    expect(schema.value.properties!.productName.title).toBe('Product name');
    wrapper.unmount();
  });

  it('edits the allowed values of a choice and shows a duplicate', async () => {
    const { wrapper, schema } = mountEditor(start());
    await wrapper.find('[data-path="category"] button').trigger('click');
    await button(wrapper, 'Add value').trigger('click');
    expect(schema.value.properties!.category.oneOf).toEqual([
      { const: 'a', title: 'A' },
      { const: 'option-2', title: 'Option 2' },
    ]);
    const second = wrapper.findAll('label').find((label) => label.text() === 'Value 2')!;
    await wrapper.find(`input[id="${second.attributes('for')}"]`).setValue('a');
    expect(wrapper.find('.coar-schema-editor-inspector').text()).toContain('Each value may appear only once.');
    expect(wrapper.find('[data-path="category"] .coar-schema-editor-warning').exists()).toBe(true);
    wrapper.unmount();
  });

  it('removes the selected property and selects its neighbour', async () => {
    const { wrapper, schema } = mountEditor(start());
    await button(wrapper, 'Remove').trigger('click');
    expect(orderedKeys(schema.value)).toEqual(['dimensions', 'category']);
    expect(wrapper.find('.coar-schema-editor-item--selected').attributes('data-path')).toBe('dimensions');
    wrapper.unmount();
  });
});
