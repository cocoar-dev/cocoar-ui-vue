import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref } from 'vue';
import CoarObjectEditor from './CoarObjectEditor.vue';
import { Temporal } from '@js-temporal/polyfill';
import type { JsonObject, JsonSchema } from '../core/schema';

function mountDate(property: JsonSchema, value: JsonObject, extra: Record<string, unknown> = {}) {
  const model = ref<JsonObject | undefined>(value);
  const editor = ref<InstanceType<typeof CoarObjectEditor>>();
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(CoarObjectEditor, {
          ref: editor,
          schema: { type: 'object', properties: { when: property, note: { type: 'string' } } },
          modelValue: model.value,
          'onUpdate:modelValue': (next: JsonObject | undefined) => (model.value = next),
          locale: 'de-DE',
          ...extra,
        }),
    }),
    { attachTo: document.body },
  );
  return { wrapper, model, issues: () => editor.value!.issues };
}

/** The shown text with the date moved by one day, the time as shown. */
function nextDayText(shown: string): string {
  const [day, ...rest] = shown.split(' ');
  const next = Temporal.PlainDate.from(day.split('.').reverse().join('-')).add({ days: 1 });
  return [next.toString().split('-').reverse().join('.'), ...rest].join(' ');
}

describe('CoarObjectEditor dates', () => {
  describe('a refused entry is in issues while it is shown (#115)', () => {
    it.each([true, false])('with validate %s, over an inherited value, until Esc', async (validate) => {
      const { wrapper, model, issues } = mountDate(
        { type: 'string', format: 'date' },
        { note: 'local edit' },
        { base: { when: '2026-06-15' }, validate },
      );
      const input = wrapper.find('[data-pointer="/when"] input');
      await input.setValue('30.02.2026');
      await input.trigger('blur');
      expect(issues()).toEqual([
        { pointer: '/when', keyword: 'refused', message: 'Not a date: the value is unchanged. Esc restores it.' },
      ]);
      expect(model.value).toEqual({ note: 'local edit' });
      await input.trigger('keydown', { key: 'Escape' });
      expect((input.element as HTMLInputElement).value).toBe('15.06.2026');
      expect(issues()).toEqual([]);
      expect(model.value).toEqual({ note: 'local edit' });
      wrapper.unmount();
    });

    it('ends with a valid entry, and for a number and JSON too', async () => {
      const { wrapper, issues } = mountDate({ type: 'string', format: 'date' }, {});
      const input = wrapper.find('[data-pointer="/when"] input');
      await input.setValue('30.02.2026');
      await input.trigger('blur');
      expect(issues().map((issue) => issue.keyword)).toEqual(['refused']);
      await input.setValue('28.02.2026');
      expect(issues()).toEqual([]);
      wrapper.unmount();

      const number = mountDate({ type: 'number' }, {});
      const field = number.wrapper.find('[data-pointer="/when"] input');
      await field.setValue('1.234,5');
      await field.trigger('blur');
      expect(number.issues()).toEqual([expect.objectContaining({ pointer: '/when', keyword: 'refused' })]);
      number.wrapper.unmount();
    });

    it('ends when the row goes away', async () => {
      const view = ref<'all' | 'local'>('all');
      const editor = ref<InstanceType<typeof CoarObjectEditor>>();
      const wrapper = mount(
        defineComponent({
          setup: () => () =>
            h(CoarObjectEditor, {
              ref: editor,
              schema: { type: 'object', properties: { when: { type: 'string', format: 'date' }, note: { type: 'string' } } },
              modelValue: { note: 'local edit' },
              base: { when: '2026-06-15' },
              view: view.value,
              locale: 'de-DE',
            }),
        }),
        { attachTo: document.body },
      );
      const input = wrapper.find('[data-pointer="/when"] input');
      await input.setValue('30.02.2026');
      await input.trigger('blur');
      expect(editor.value!.issues).toHaveLength(1);
      view.value = 'local';
      await nextTick();
      expect(wrapper.find('[data-pointer="/when"]').exists()).toBe(false);
      expect(editor.value!.issues).toEqual([]);
      wrapper.unmount();
    });
  });

  it('keeps sub-millisecond digits when only the date is edited (#115)', async () => {
    const stored = '2026-07-01T00:30:56.1234567+05:45';
    const { wrapper, model } = mountDate({ type: 'string', format: 'date-time' }, {}, { base: { when: stored } });
    const input = wrapper.find('[data-pointer="/when"] input');
    const shown = (input.element as HTMLInputElement).value;
    expect(shown).toMatch(/:56\.123$/);
    await input.trigger('focus');
    await input.trigger('blur');
    expect(model.value).toEqual({});
    await input.setValue(nextDayText(shown));
    expect(model.value).toEqual({ when: '2026-07-02T00:30:56.1234567+05:45' });
    wrapper.unmount();
  });

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
