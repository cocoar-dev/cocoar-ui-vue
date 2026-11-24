import { describe, expect, it } from 'vitest';
import { defineComponent, h, markRaw, nextTick, ref } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import CoarObjectEditor from './CoarObjectEditor.vue';
import { defineObjectEditorTypes } from '../types/builtins';
import type { JsonObject, JsonSchema, JsonValue } from '../core/schema';
import type { CoarValueType } from '../types/types';
import type { ObjectEditorIssue } from '../core/validate';

const row = (wrapper: VueWrapper, pointer: string) => wrapper.find(`[data-pointer="${pointer}"]`);
const ENVELOPE = { $enc: 'v1', data: 'c2VjcmV0LXBsYWludGV4dA==' };

function mountEditor(schema: JsonSchema, value: JsonObject | undefined, extra: Record<string, unknown> = {}) {
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

describe('sensitive values (#88)', () => {
  const SecretControl = markRaw(
    defineComponent({
      props: ['modelValue', 'id'],
      emits: ['update:modelValue'],
      // Write-only: never shows the stored value, emits a new envelope when typed into.
      setup: (props, { emit }) => () =>
        h('input', { id: props.id, class: 'secret', value: '', onInput: () => emit('update:modelValue', { $enc: 'v1', data: 'bmV3' }) }),
    }),
  );
  const secret: CoarValueType = {
    id: 'secret',
    label: 'Secret',
    icon: 'lock',
    schema: { type: 'string' },
    sensitive: true,
    validateSchema: false,
    control: SecretControl,
  };
  const schema: JsonSchema = {
    type: 'object',
    properties: {
      password: { type: 'string', title: 'Password', 'x-cocoar-secret': true },
      note: { type: 'string', title: 'Note' },
    },
  };
  const resolveType = ({ schema: property }: { schema: JsonSchema }) => (property['x-cocoar-secret'] ? 'secret' : undefined);

  it('lets the app choose the type from its own marker, without schema type errors for the stored envelope', () => {
    const { wrapper } = mountEditor(schema, { password: ENVELOPE as never }, { types: defineObjectEditorTypes([secret]), resolveType });
    expect(row(wrapper, '/password').find('input.secret').exists()).toBe(true);
    expect(row(wrapper, '/password').find('.coar-object-editor-error').exists()).toBe(false);
    wrapper.unmount();
  });

  it('never prints a sensitive or redacted value, also not for unknown keys', () => {
    const isEnvelope = (_: string, value: JsonValue) => typeof value === 'object' && value !== null && '$enc' in value;
    const { wrapper } = mountEditor(
      schema,
      { password: ENVELOPE as never, note: 'visible', legacy: ENVELOPE as never },
      { types: defineObjectEditorTypes([secret]), resolveType, redact: isEnvelope, mode: 'view' },
    );
    const html = wrapper.html();
    expect(html).not.toContain(ENVELOPE.data);
    expect(html).not.toContain('$enc');
    expect(row(wrapper, '/legacy').text()).toContain('••••••');
    wrapper.unmount();
  });

  it('masks a row whose value holds a redacted value deeper inside, in view and edit', () => {
    const isEnvelope = (_: string, value: JsonValue) => typeof value === 'object' && value !== null && '$enc' in value;
    const pointers: string[] = [];
    const redact = (pointer: string, value: JsonValue) => (pointers.push(pointer), isEnvelope(pointer, value));
    for (const mode of ['view', 'edit'] as const) {
      const { wrapper } = mountEditor(
        { type: 'object', properties: { tags: { type: 'array', items: {} } } },
        { legacy: { keep: 1, nested: { pw: ENVELOPE as never } }, tags: [{ pw: ENVELOPE as never }] as never, plain: { keep: 2 } },
        { redact, mode },
      );
      const html = wrapper.html();
      expect(html).not.toContain(ENVELOPE.data);
      expect(row(wrapper, '/legacy').text()).toContain('••••••');
      expect(row(wrapper, '/plain').text()).toContain('{"keep":2}');
      wrapper.unmount();
    }
    expect(pointers).toContain('/legacy/nested/pw');
    expect(pointers).toContain('/tags/0/pw');
  });

  it('masks a redacted value also where the type has a control, in view and edit', () => {
    for (const mode of ['view', 'edit'] as const) {
      const { wrapper } = mountEditor(schema, { note: 'topsecretvalue' }, { redact: () => true, mode });
      expect(wrapper.html()).not.toContain('topsecretvalue');
      expect(row(wrapper, '/note').find('input').exists()).toBe(false);
      expect(row(wrapper, '/note').text()).toContain('••••••');
      wrapper.unmount();
    }
  });

  it('keeps the required check of a value whose schema checks are skipped', () => {
    const required: JsonSchema = { ...schema, required: ['password'] };
    const { wrapper } = mountEditor(required, {}, { types: defineObjectEditorTypes([secret]), resolveType });
    expect(row(wrapper, '/password').find('.coar-object-editor-error').text()).toBe('Required.');
    wrapper.unmount();
  });

  it('keeps an existing secret until the app control emits a new one', async () => {
    const { wrapper, model } = mountEditor(schema, { password: ENVELOPE as never, note: 'x' }, { types: defineObjectEditorTypes([secret]), resolveType });
    expect(model.value).toEqual({ password: ENVELOPE, note: 'x' });
    await row(wrapper, '/password').find('input.secret').trigger('input');
    expect(model.value).toEqual({ password: { $enc: 'v1', data: 'bmV3' }, note: 'x' });
    wrapper.unmount();
  });
});

describe('inherited base values (#87)', () => {
  const schema: JsonSchema = {
    type: 'object',
    properties: {
      enabled: { type: ['boolean', 'null'], title: 'Enabled' },
      level: { type: 'integer', title: 'Level' },
      proxy: {
        type: ['object', 'null'],
        title: 'Proxy',
        properties: { host: { type: 'string', title: 'Host' }, port: { type: 'integer', title: 'Port' } },
      },
    },
  };
  const base = { enabled: true, level: 3, proxy: { host: 'base.example', port: 8080 } };
  const origin = (pointer: string) => ({ label: `product${pointer}` });

  it('shows an inherited value without writing it, and writes only what is edited', async () => {
    const { wrapper, model } = mountEditor(schema, {}, { base, origin });
    expect(row(wrapper, '/enabled').attributes('data-state')).toBe('inherited');
    expect(row(wrapper, '/enabled').find('.coar-object-editor-origin').text()).toBe('product/enabled');
    expect(model.value).toEqual({});
    const switchInput = row(wrapper, '/enabled').find('input[type="checkbox"], [role="switch"]');
    await switchInput.trigger('click');
    await nextTick();
    expect(model.value).toEqual({ enabled: false });
    expect(row(wrapper, '/enabled').attributes('data-state')).toBe('local');
    wrapper.unmount();
  });

  it('resets to the inherited value by removing the local key, also after an explicit null', async () => {
    const { wrapper, model } = mountEditor(schema, { enabled: null, level: 5 }, { base });
    const rowOf = (pointer: string) =>
      wrapper.findAllComponents({ name: 'ObjectEditorRow' }).find((c) => c.props('row').pointer === pointer)!;
    expect(rowOf('/enabled').props('hasBase')).toBe(true);
    rowOf('/enabled').vm.$emit('remove');
    await nextTick();
    expect(model.value).toEqual({ level: 5 });
    expect(row(wrapper, '/enabled').attributes('data-state')).toBe('inherited');
    wrapper.unmount();
  });

  it('locks the rows below a group that is null, until the group is filled in', async () => {
    const { wrapper, model } = mountEditor(schema, {}, { base: { ...base, proxy: null } });
    expect(row(wrapper, '/proxy/host').classes()).toContain('coar-object-editor-row--locked');
    expect(row(wrapper, '/proxy/host').find('input').exists()).toBe(false);
    expect(row(wrapper, '/proxy/host').text()).toContain('Proxy is null');
    const group = wrapper.findAllComponents({ name: 'ObjectEditorRow' }).find((c) => c.props('row').pointer === '/proxy')!;
    group.vm.$emit('update:value', {});
    await nextTick();
    expect(model.value).toEqual({ proxy: {} });
    expect(row(wrapper, '/proxy/host').classes()).not.toContain('coar-object-editor-row--locked');
    wrapper.unmount();
  });

  it('removes a group a reset leaves empty over a base, and keeps {} without one', async () => {
    const layered = mountEditor(schema, { proxy: { host: 'x' } }, { base });
    const hostRow = (w: VueWrapper) => w.findAllComponents({ name: 'ObjectEditorRow' }).find((c) => c.props('row').pointer === '/proxy/host')!;
    hostRow(layered.wrapper).vm.$emit('remove');
    await nextTick();
    expect(layered.model.value).toEqual({});
    layered.wrapper.unmount();
    const plain = mountEditor(schema, { proxy: { host: 'x' } });
    hostRow(plain.wrapper).vm.$emit('remove');
    await nextTick();
    expect(plain.model.value).toEqual({ proxy: {} });
    plain.wrapper.unmount();
  });

  it('shows only local keys and their groups in the local view, without changing the document', () => {
    const local = { level: 0, proxy: { port: 0 } };
    const { wrapper, model } = mountEditor(schema, structuredClone(local), { base, view: 'local' });
    const pointers = wrapper.findAll('[data-pointer]').map((element) => element.attributes('data-pointer'));
    expect(pointers).toEqual(['/level', '/proxy', '/proxy/port']);
    expect(model.value).toEqual(local);
    wrapper.unmount();
  });

  it('shows the issues of the app instead of its own when validate is off', () => {
    const issues: ObjectEditorIssue[] = [{ pointer: '/level', keyword: 'custom', message: 'Above the product limit.' }];
    const strict: JsonSchema = { ...schema, required: ['enabled'] };
    const { wrapper } = mountEditor(strict, {}, { base, validate: false, issues });
    expect(row(wrapper, '/enabled').find('.coar-object-editor-error').exists()).toBe(false);
    expect(row(wrapper, '/level').find('.coar-object-editor-error').text()).toBe('Above the product limit.');
    wrapper.unmount();
  });

  it('marks a value whose contexts disagree instead of showing one as the value', () => {
    const { wrapper } = mountEditor(schema, {}, { base, origin: () => ({ label: 'several', conflict: true }) });
    expect(row(wrapper, '/level').text()).toContain('differs by context');
    expect(row(wrapper, '/level').text()).not.toContain('3');
    wrapper.unmount();
  });
});
