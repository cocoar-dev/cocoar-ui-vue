import { describe, expect, it } from 'vitest';
import Ajv2020 from 'ajv/dist/2020';
import { h, nextTick, shallowRef, type Component } from 'vue';
import { mount } from '@vue/test-utils';
import {
  addProperty,
  changePropertyType,
  droppedByTypeChange,
  setEntryType,
  setNullable,
  setOptions,
  unsupportedKeywords,
  updateProperty,
} from './schema-ops';
import { createObjectSchema, type JsonSchema } from './schema';
import { defineObjectEditorTypes } from '../types/builtins';
import CoarSchemaEditor from '../components/CoarSchemaEditor.vue';

const types = defineObjectEditorTypes();
const type = (id: string) => types.get(id)!;

// An imported schema with things the editor does not write itself.
const imported = (): JsonSchema => ({
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $comment: 'from the client application',
  type: 'object',
  'x-client': { version: 7 },
  properties: {
    title: { type: 'string', title: 'Title', examples: ['A'], 'x-ui-hint': 'wide' },
    retries: { type: ['integer', 'null'], minimum: 0 },
    mode: { anyOf: [{ $ref: '#/$defs/mode' }, { type: 'null' }] },
    rule: { allOf: [{ type: 'string' }, { minLength: 2 }], title: 'Rule' },
  },
  $defs: { mode: { type: 'string', enum: ['fast', 'safe'] }, unused: { type: 'number' } },
});

describe('authoring imported schemas (#89)', () => {
  it('changes only what is edited: title and description leave everything else as it was', () => {
    const before = imported();
    let after = updateProperty(before, ['title'], { title: 'Headline', description: 'Shown on top' });
    after = updateProperty(after, ['retries'], { description: 'How often' });
    const others = (schema: JsonSchema) =>
      Object.fromEntries(Object.entries(schema.properties!).filter(([key]) => key !== 'title' && key !== 'retries'));
    expect(others(after)).toEqual(others(before));
    expect({ ...after, properties: undefined }).toEqual({ ...before, properties: undefined });
    expect(after.properties!.title).toEqual({ ...before.properties!.title, title: 'Headline', description: 'Shown on top' });
    expect(after.properties!.retries).toEqual({ ...before.properties!.retries, description: 'How often' });
  });

  it('names what it cannot edit', () => {
    expect(unsupportedKeywords(imported().properties!.rule)).toEqual(['allOf']);
    expect(unsupportedKeywords(imported().properties!.mode)).toEqual([]);
    expect(unsupportedKeywords(imported().properties!.title)).toEqual([]);
  });

  it('names the keywords a type change drops', () => {
    expect(droppedByTypeChange(imported(), ['retries'], type('text'))).toEqual(['minimum']);
    expect(droppedByTypeChange(imported(), ['title'], type('multiline'))).toEqual(['examples']);
    const changed = changePropertyType(imported(), ['title'], type('multiline'));
    expect(changed.properties!.title).toEqual({ type: 'string', 'x-coar-type': 'multiline', title: 'Title', 'x-ui-hint': 'wide' });
  });

  it('allows and forbids null in the form the property already uses', () => {
    let schema = imported();
    schema = setNullable(schema, ['mode'], false);
    expect(schema.properties!.mode).toEqual({ $ref: '#/$defs/mode' });
    schema = setNullable(schema, ['mode'], true);
    expect(schema.properties!.mode).toEqual({ anyOf: [{ $ref: '#/$defs/mode' }, { type: 'null' }] });
    schema = setNullable(schema, ['retries'], false);
    expect(schema.properties!.retries.type).toBe('integer');
    schema = setNullable(addProperty(schema, [], 'on', type('boolean')), ['on'], true);
    expect(schema.properties!.on.type).toEqual(['boolean', 'null']);
  });

  it('lets a typed enum and a typed choice accept null, checked by Ajv', () => {
    const ajv = new Ajv2020({ strict: false });
    let schema: JsonSchema = {
      type: 'object',
      properties: {
        mode: { type: 'string', enum: ['a', 'b'] },
        level: { type: 'string', oneOf: [{ const: 'x' }] },
      },
    };
    schema = setNullable(setNullable(schema, ['mode'], true), ['level'], true);
    expect(schema.properties!.mode).toEqual({ type: ['string', 'null'], enum: ['a', 'b', null] });
    expect(ajv.compile(schema)({ mode: null, level: null })).toBe(true);
    schema = setNullable(schema, ['mode'], false);
    expect(schema.properties!.mode).toEqual({ type: 'string', enum: ['a', 'b'] });
  });

  it('writes choices as enum for an enum profile, and keeps a null alternative', () => {
    let schema = addProperty(createObjectSchema(), [], 'mode', type('choice'), { choiceEncoding: 'enum' });
    expect(schema.properties!.mode).toEqual({ 'x-coar-type': 'choice', enum: ['option-1'] });
    schema = setNullable(schema, ['mode'], true);
    schema = setOptions(schema, ['mode'], [{ value: 'fast', label: 'Fast' }, { value: 'safe', label: 'Safe' }]);
    expect(schema.properties!.mode.enum).toEqual(['fast', 'safe', null]);
    schema = changePropertyType(schema, ['mode'], type('choices'), { choiceEncoding: 'enum' });
    expect(schema.properties!.mode.items).toEqual({ enum: ['option-1'] });
  });

  it('authors ordered lists and typed maps', () => {
    let schema = addProperty(createObjectSchema(), [], 'servers', type('list'));
    schema = setEntryType(schema, ['servers'], type('number'));
    expect(schema.properties!.servers).toEqual({ type: 'array', items: { type: 'number', 'x-coar-type': 'number' }, 'x-coar-type': 'list' });
    schema = addProperty(schema, [], 'limits', type('map'));
    schema = setEntryType(schema, ['limits'], type('boolean'));
    expect(schema.properties!.limits.additionalProperties).toEqual({ type: 'boolean', 'x-coar-type': 'boolean' });
  });
});

describe('CoarSchemaEditor profile (#89)', () => {
  function mountEditor(initial: JsonSchema, profile?: object) {
    const schema = shallowRef(initial);
    const wrapper = mount(
      () => h(CoarSchemaEditor as Component, { modelValue: schema.value, profile, 'onUpdate:modelValue': (next: JsonSchema) => (schema.value = next) }),
      { attachTo: document.body },
    );
    return { wrapper, schema };
  }

  it('offers only the types of the profile and shows its diagnostics', () => {
    const { wrapper } = mountEditor(imported(), {
      types: ['text', 'number'],
      diagnostics: () => [{ path: ['title'], message: 'Titles are limited to 40 characters here.' }],
    });
    const select = wrapper.findAllComponents({ name: 'CoarSelect' })[0];
    expect((select.props('options') as { value: string }[]).map((o) => o.value)).toEqual(['text', 'number']);
    expect(wrapper.find('.coar-schema-editor-inspector').text()).toContain('Titles are limited to 40 characters here.');
    wrapper.unmount();
  });

  it('asks before a type change that drops keywords', async () => {
    const { wrapper, schema } = mountEditor(imported());
    await wrapper.find('[data-path="retries"] button').trigger('click');
    const select = wrapper.findAllComponents({ name: 'CoarSelect' }).find((c) => c.props('modelValue') === 'number')!;
    select.vm.$emit('update:modelValue', 'text');
    await nextTick();
    expect(schema.value.properties!.retries.minimum).toBe(0);
    expect(wrapper.find('.coar-schema-editor-confirm').text()).toContain('minimum');
    await wrapper.findAll('.coar-schema-editor-confirm button')[0].trigger('click');
    expect(schema.value.properties!.retries.minimum).toBeUndefined();
    wrapper.unmount();
  });

  it('shows a property it cannot edit without its type and settings', async () => {
    const { wrapper } = mountEditor(imported());
    await wrapper.find('[data-path="rule"] button').trigger('click');
    expect(wrapper.find('.coar-schema-editor-note').text()).toContain('allOf');
    expect(wrapper.findAllComponents({ name: 'CoarSwitch' })).toHaveLength(0);
    wrapper.unmount();
  });
});
