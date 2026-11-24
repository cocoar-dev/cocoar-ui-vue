import { describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import CoarObjectEditor from './CoarObjectEditor.vue';
import type { JsonObject, JsonSchema, JsonValue } from '../core/schema';

const row = (wrapper: VueWrapper, pointer: string) => wrapper.find(`[data-pointer="${pointer}"]`);
const schema: JsonSchema = {
  type: 'object',
  properties: { DatabaseSettings: { type: 'object', properties: { Host: { type: 'string' } } } },
};
const document = (): JsonObject => ({
  DatabaseSettings: { Host: 'db', UnknownLegacy: { Keep: 1 }, Port: 5432, Tags: ['a'], Nothing: null },
  TopLevel: 'x',
});

function mountEditor(value: JsonObject, extra: Record<string, unknown> = {}) {
  const model = ref<JsonObject | undefined>(value);
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
    { attachTo: globalThis.document.body },
  );
  return { wrapper, model };
}

async function enter(wrapper: VueWrapper, pointer: string, text: string) {
  const input = row(wrapper, pointer).find('input');
  await input.setValue(text);
  await input.trigger('blur');
}

const all = () => true;

describe('values the schema does not describe (#104)', () => {
  it('stay read-only without editUnknown', () => {
    const { wrapper } = mountEditor(document());
    expect(row(wrapper, '/DatabaseSettings/UnknownLegacy').find('input').exists()).toBe(false);
    expect(row(wrapper, '/DatabaseSettings/UnknownLegacy').text()).toContain('{"Keep":1}');
    wrapper.unmount();
  });

  it('edits a value at its path without changing its siblings', async () => {
    const { wrapper, model } = mountEditor(document(), { editUnknown: all });
    const input = row(wrapper, '/DatabaseSettings/UnknownLegacy').find('input');
    expect((input.element as HTMLInputElement).value).toBe('{"Keep":1}');
    expect((row(wrapper, '/DatabaseSettings/Nothing').find('input').element as HTMLInputElement).value).toBe('null');
    await enter(wrapper, '/DatabaseSettings/UnknownLegacy', '{"Keep":2}');
    const expected = document();
    (expected.DatabaseSettings as JsonObject).UnknownLegacy = { Keep: 2 };
    expect(model.value).toEqual(expected);
    wrapper.unmount();
  });

  it.each([
    ['/DatabaseSettings/Port', '5433', 5433],
    ['/DatabaseSettings/Tags', '["a","b"]', ['a', 'b']],
    ['/TopLevel', '"y"', 'y'],
    ['/DatabaseSettings/Port', 'null', null],
    ['/DatabaseSettings/Nothing', '{}', {}],
    ['/DatabaseSettings/Tags', '[]', []],
    ['/TopLevel', '""', ''],
  ])('writes %s as %s', async (pointer, text, expected) => {
    const { wrapper, model } = mountEditor(document(), { editUnknown: all, presence: 'filled' });
    await enter(wrapper, pointer, text);
    const tokens = pointer.slice(1).split('/');
    const parent = tokens.slice(0, -1).reduce<JsonValue>((node, key) => (node as JsonObject)[key], model.value as JsonValue);
    expect(Object.hasOwn(parent as JsonObject, tokens.at(-1)!)).toBe(true);
    expect((parent as JsonObject)[tokens.at(-1)!]).toEqual(expected);
    wrapper.unmount();
  });

  it('leaves the document alone for invalid JSON, empty text and a cancel', async () => {
    const { wrapper, model } = mountEditor(document(), { editUnknown: all });
    await enter(wrapper, '/DatabaseSettings/UnknownLegacy', '{"Keep":');
    expect(row(wrapper, '/DatabaseSettings/UnknownLegacy').find('[role="alert"]').exists()).toBe(true);
    await enter(wrapper, '/DatabaseSettings/UnknownLegacy', '');
    const input = row(wrapper, '/DatabaseSettings/UnknownLegacy').find('input');
    await input.setValue('{"Keep":3}');
    await input.trigger('keydown', { key: 'Escape' });
    expect((input.element as HTMLInputElement).value).toBe('{"Keep":1}');
    await input.trigger('blur');
    expect(model.value).toEqual(document());
    wrapper.unmount();
  });

  it('asks the app for each value, and edits only the ones it allows', () => {
    const asked: string[] = [];
    const editUnknown = (pointer: string) => (asked.push(pointer), pointer === '/TopLevel');
    const { wrapper } = mountEditor(document(), { editUnknown });
    expect(row(wrapper, '/TopLevel').find('input').exists()).toBe(true);
    expect(row(wrapper, '/DatabaseSettings/UnknownLegacy').find('input').exists()).toBe(false);
    expect(asked).toContain('/DatabaseSettings/UnknownLegacy');
    expect(row(wrapper, '/DatabaseSettings/Host').find('input').exists()).toBe(true);
    wrapper.unmount();
  });

  it('never edits or shows a redacted value, also deeper inside, and not in view mode', () => {
    const secret = { $enc: 'v1', data: 'c2VjcmV0' };
    const redact = (_: string, value: JsonValue) => typeof value === 'object' && value !== null && '$enc' in value;
    for (const mode of ['edit', 'view'] as const) {
      const { wrapper } = mountEditor({ Legacy: { pw: secret }, Plain: 1 }, { editUnknown: all, redact, mode });
      expect(wrapper.html()).not.toContain(secret.data);
      expect(row(wrapper, '/Legacy').find('input').exists()).toBe(false);
      expect(row(wrapper, '/Plain').find('input').exists()).toBe(mode === 'edit');
      wrapper.unmount();
    }
  });
});
