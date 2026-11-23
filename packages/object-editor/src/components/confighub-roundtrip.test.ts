import { describe, expect, it } from 'vitest';
import { defineComponent, h, markRaw, nextTick, ref } from 'vue';
import { mount } from '@vue/test-utils';
import Ajv2020 from 'ajv/dist/2020';
import CoarObjectEditor from './CoarObjectEditor.vue';
import { defineObjectEditorTypes } from '../types/builtins';
import type { JsonObject, JsonSchema, JsonValue } from '../core/schema';
import type { CoarValueType } from '../types/types';

// Acceptance of issue #94 with synthetic data: a product schema and a sparse
// layer document over an inherited base, edited through the component.

const schema: JsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  required: ['service'],
  properties: {
    service: {
      type: 'object',
      title: 'Service',
      properties: {
        enabled: { type: ['boolean', 'null'], title: 'Enabled' },
        mode: { type: 'string', enum: ['fast', 'safe'], title: 'Mode' },
        endpoint: { type: 'string', title: 'Endpoint' },
      },
    },
    apiKey: { type: 'string', title: 'API key', 'x-cocoar-secret': true },
    note: { type: 'string', title: 'Note' },
  },
};

const base: JsonObject = {
  service: { enabled: true, mode: 'safe', endpoint: 'https://base.example' },
  note: 'from the product',
};

const local = (): JsonObject => ({
  service: { enabled: null, mode: 'fast' },
  apiKey: { $enc: 'v1', data: 'b3BhcXVl' },
  extra: { kept: [1, 2, 3] },
});

const secret: CoarValueType = {
  id: 'secret',
  label: 'Secret',
  icon: 'lock',
  schema: { type: 'string' },
  sensitive: true,
  validateSchema: false,
  control: markRaw(defineComponent({ props: ['id'], setup: (props) => () => h('input', { id: props.id, class: 'secret' }) })),
};

function mountLayer(extra: Record<string, unknown> = {}) {
  const model = ref<JsonObject | undefined>(local());
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(CoarObjectEditor, {
          schema,
          base,
          types: defineObjectEditorTypes([secret]),
          resolveType: ({ schema: property }: { schema: JsonSchema }) => (property['x-cocoar-secret'] ? 'secret' : undefined),
          redact: (_: string, value: JsonValue) => typeof value === 'object' && value !== null && '$enc' in value,
          modelValue: model.value,
          'onUpdate:modelValue': (next: JsonObject | undefined) => (model.value = next),
          ...extra,
        }),
    }),
    { attachTo: document.body },
  );
  const rowOf = (pointer: string) =>
    wrapper.findAllComponents({ name: 'ObjectEditorRow' }).find((row) => row.props('row').pointer === pointer)!;
  return { wrapper, model, rowOf };
}

describe('ConfigHub round trip (#94)', () => {
  it('changes one field and leaves every other key, the envelope and unknown keys intact', async () => {
    const { wrapper, model, rowOf } = mountLayer();
    await wrapper.find('[data-pointer="/note"] input').setValue('customer note');
    expect(model.value).toEqual({ ...local(), note: 'customer note' });
    rowOf('/service/mode').vm.$emit('update:value', 'safe');
    await nextTick();
    expect(model.value).toEqual({ ...local(), note: 'customer note', service: { enabled: null, mode: 'safe' } });
    wrapper.unmount();
  });

  it('resets a local value to the inherited one without writing the base', async () => {
    const { model, rowOf, wrapper } = mountLayer();
    rowOf('/service/enabled').vm.$emit('remove');
    await nextTick();
    expect(model.value).toEqual({ ...local(), service: { mode: 'fast' } });
    expect(wrapper.find('[data-pointer="/service/enabled"]').attributes('data-state')).toBe('inherited');
    expect(JSON.stringify(model.value)).not.toContain('base.example');
    wrapper.unmount();
  });

  it('switches between all and local views without changing the document', () => {
    for (const view of ['all', 'local'] as const) {
      const { model, wrapper } = mountLayer({ view });
      expect(model.value).toEqual(local());
      const pointers = wrapper.findAll('[data-pointer]').map((row) => row.attributes('data-pointer'));
      if (view === 'local') {
        expect(pointers).toEqual(['/service', '/service/enabled', '/service/mode', '/apiKey', '/extra']);
      } else {
        expect(pointers).toContain('/note');
      }
      wrapper.unmount();
    }
  });

  it('never prints the secret and reports no schema error for its envelope', () => {
    const { wrapper } = mountLayer({ mode: 'view' });
    expect(wrapper.html()).not.toContain('b3BhcXVl');
    expect(wrapper.find('[data-pointer="/apiKey"] .coar-object-editor-error').exists()).toBe(false);
    wrapper.unmount();
  });

  it('edits an ordered list and a map of the layer and leaves the rest intact', async () => {
    const listSchema: JsonSchema = {
      type: 'object',
      properties: {
        hosts: { type: 'array', items: { type: 'string' }, title: 'Hosts' },
        quotas: { type: 'object', additionalProperties: { type: 'integer' }, title: 'Quotas' },
        note: { type: 'string' },
      },
    };
    const model = ref<JsonObject | undefined>({ hosts: ['a', 'b', 'a'], quotas: { cpu: 0 }, note: 'x', other: true });
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(CoarObjectEditor, {
            schema: listSchema,
            modelValue: model.value,
            'onUpdate:modelValue': (next: JsonObject | undefined) => (model.value = next),
          }),
      }),
      { attachTo: document.body },
    );
    const rowOf = (pointer: string) =>
      wrapper.findAllComponents({ name: 'ObjectEditorRow' }).find((row) => row.props('row').pointer === pointer)!;
    rowOf('/hosts/2').vm.$emit('move', -1);
    await nextTick();
    rowOf('/quotas/cpu').vm.$emit('rename', 'cores');
    await nextTick();
    expect(model.value).toEqual({ hosts: ['a', 'a', 'b'], quotas: { cores: 0 }, note: 'x', other: true });
    wrapper.unmount();
  });

  it('keeps a schema that a second validator accepts', () => {
    const ajv = new Ajv2020({ strict: false });
    expect(ajv.validateSchema(schema)).toBe(true);
  });
});
