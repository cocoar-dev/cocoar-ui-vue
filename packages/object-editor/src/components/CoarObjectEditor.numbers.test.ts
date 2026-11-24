import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import CoarObjectEditor from './CoarObjectEditor.vue';
import type { JsonObject, JsonSchema } from '../core/schema';

function mountNumber(property: JsonSchema, value: JsonObject, locale: string, mode: 'edit' | 'view' = 'edit') {
  const model = ref<JsonObject | undefined>(value);
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(CoarObjectEditor, {
          schema: { type: 'object', properties: { timeout: property } },
          modelValue: model.value,
          'onUpdate:modelValue': (next: JsonObject | undefined) => (model.value = next),
          locale,
          mode,
        }),
    }),
    { attachTo: document.body },
  );
  return { wrapper, model };
}

async function enter(wrapper: ReturnType<typeof mountNumber>['wrapper'], text: string) {
  const input = wrapper.find('input[inputmode="decimal"]');
  await input.setValue(text);
  await input.trigger('blur');
}

describe('CoarObjectEditor numbers', () => {
  it.each([
    ['de-DE', '12,3456', 12.3456],
    ['de-DE', '12.3456', 12.3456],
    ['en-US', '12.3456', 12.3456],
    ['de-DE', '42', 42],
    ['en-US', '42', 42],
  ])('%s stores %s as %d', async (locale, text, expected) => {
    const { wrapper, model } = mountNumber({ type: 'number' }, { timeout: 1 }, locale);
    await enter(wrapper, text);
    expect(model.value).toEqual({ timeout: expected });
    wrapper.unmount();
  });

  it('refuses a separator that would change the magnitude, with a message', async () => {
    const { wrapper, model } = mountNumber({ type: 'number' }, { timeout: 1 }, 'en-US');
    await enter(wrapper, '12,3456');
    expect(model.value).toEqual({ timeout: 1 });
    expect(wrapper.find('[role="alert"]').text()).toContain('decimal separator');
    wrapper.unmount();
  });

  it.each(['de-DE', 'en-US'])('%s leaves an existing value alone when the field is left', async (locale) => {
    const { wrapper, model } = mountNumber({ type: 'number', maximum: 10 }, { timeout: 12.3456 }, locale);
    const input = wrapper.find('input[inputmode="decimal"]');
    await input.trigger('focus');
    await input.trigger('blur');
    expect(model.value).toEqual({ timeout: 12.3456 });
    wrapper.unmount();
  });

  it('shows every decimal in view mode without a fixed scale', () => {
    const { wrapper } = mountNumber({ type: 'number' }, { timeout: 12.3456 }, 'de-DE', 'view');
    expect(wrapper.text()).toContain('12,3456');
    wrapper.unmount();
  });

  it('honors a fixed scale for display and entry', async () => {
    const { wrapper, model } = mountNumber({ type: 'number', 'x-coar-decimals': 2 }, { timeout: 1.5 }, 'de-DE');
    expect((wrapper.find('input[inputmode="decimal"]').element as HTMLInputElement).value).toBe('1,50');
    await enter(wrapper, '1,234');
    expect(model.value).toEqual({ timeout: 1.5 });
    expect(wrapper.find('[role="alert"]').text()).toContain('2');
    await enter(wrapper, '1,23');
    expect(model.value).toEqual({ timeout: 1.23 });
    wrapper.unmount();
  });

  it('refuses a fraction for an integer', async () => {
    const { wrapper, model } = mountNumber({ type: 'integer' }, { timeout: 3 }, 'en-US');
    await enter(wrapper, '3.5');
    expect(model.value).toEqual({ timeout: 3 });
    wrapper.unmount();
  });

});
