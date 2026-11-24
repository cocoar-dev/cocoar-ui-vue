import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import CoarObjectEditor from './CoarObjectEditor.vue';
import { Temporal } from '@js-temporal/polyfill';
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

  describe('date-time keeps what was not changed (#111)', () => {
    const precise = '2026-07-01T15:46:56.123+05:00';

    it('leaves a value with a fraction and its own offset alone when the field is visited', async () => {
      const { wrapper, model } = mountDate({ type: 'string', format: 'date-time' }, { when: precise });
      const input = wrapper.find('input');
      const shown = (input.element as HTMLInputElement).value;
      expect(shown).toMatch(/:56\.123$/);
      await input.trigger('focus');
      await input.setValue(shown);
      await input.trigger('blur');
      expect(model.value).toEqual({ when: precise });
      wrapper.unmount();
    });

    it('writes a changed date with the time, fraction and offset the value had', async () => {
      const { wrapper, model } = mountDate({ type: 'string', format: 'date-time' }, { when: precise });
      const input = wrapper.find('input');
      const shown = (input.element as HTMLInputElement).value;
      const [day, ...rest] = shown.split(' ');
      const nextDay = Temporal.PlainDate.from(day.split('.').reverse().join('-')).add({ days: 1 });
      await input.setValue([nextDay.toString().split('-').reverse().join('.'), ...rest].join(' '));
      expect(model.value).toEqual({ when: '2026-07-02T15:46:56.123+05:00' });
      wrapper.unmount();
    });

    it('keeps Z for a UTC value', async () => {
      const { wrapper, model } = mountDate({ type: 'string', format: 'date-time' }, { when: '2026-07-01T15:46:56Z' });
      const input = wrapper.find('input');
      const shown = (input.element as HTMLInputElement).value;
      expect(shown).toMatch(/:56$/);
      const [day, ...rest] = shown.split(' ');
      const nextDay = Temporal.PlainDate.from(day.split('.').reverse().join('-')).add({ days: 1 });
      await input.setValue([nextDay.toString().split('-').reverse().join('.'), ...rest].join(' '));
      expect(model.value).toEqual({ when: '2026-07-02T15:46:56Z' });
      wrapper.unmount();
    });
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
