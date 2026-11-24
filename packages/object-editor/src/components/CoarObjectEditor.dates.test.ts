import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import CoarObjectEditor from './CoarObjectEditor.vue';
import type { JsonObject, JsonSchema } from '../core/schema';

function mountDate(property: JsonSchema, value: JsonObject) {
  const model = ref<JsonObject | undefined>(value);
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(CoarObjectEditor, {
          schema: { type: 'object', properties: { when: property } },
          modelValue: model.value,
          'onUpdate:modelValue': (next: JsonObject | undefined) => (model.value = next),
          locale: 'de-DE',
        }),
    }),
    { attachTo: document.body },
  );
  return { wrapper, model };
}

describe('CoarObjectEditor dates', () => {
  it('refuses an impossible day with a message and keeps the value (#109)', async () => {
    const { wrapper, model } = mountDate({ type: 'string', format: 'date' }, { when: '2026-03-14' });
    const input = wrapper.find('input');
    await input.setValue('30.02.2026');
    await input.trigger('blur');
    expect(model.value).toEqual({ when: '2026-03-14' });
    expect(input.attributes('aria-invalid')).toBe('true');
    expect(wrapper.find('[role="alert"]').text()).toContain('Not a date');
    await input.trigger('keydown', { key: 'Escape' });
    expect((input.element as HTMLInputElement).value).toBe('14.03.2026');
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('refuses an impossible day in a date-time with a message', async () => {
    const { wrapper, model } = mountDate({ type: 'string', format: 'date-time' }, {});
    const input = wrapper.find('input');
    await input.setValue('30.02.2026 10:30');
    await input.trigger('blur');
    expect(model.value).toEqual({});
    expect(wrapper.find('[role="alert"]').text()).toContain('Not a date and time');
    wrapper.unmount();
  });
});
