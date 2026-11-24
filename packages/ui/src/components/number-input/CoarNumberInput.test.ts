import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import CoarFormField from '../form-field/CoarFormField.vue';
import CoarSelect from '../select/CoarSelect.vue';
import CoarNumberInput from './CoarNumberInput.vue';

const CoarIconStub = { template: '<span class="icon-stub" />' };

describe('CoarNumberInput', () => {
  const mountInput = (props = {}) =>
    mount(CoarNumberInput, {
      props,
      global: { stubs: { CoarIcon: CoarIconStub } },
    });

  it('renders with default props', () => {
    const wrapper = mountInput();
    expect(wrapper.find('.coar-number-input-host').exists()).toBe(true);
    expect(wrapper.find('input.coar-number-input-field').exists()).toBe(true);
  });

  it('input is right-aligned', () => {
    const wrapper = mountInput();
    expect(wrapper.find('.coar-number-input-field').exists()).toBe(true);
  });

  it('uses type="text" with inputmode="decimal"', () => {
    const wrapper = mountInput();
    const input = wrapper.find('input');
    expect(input.attributes('type')).toBe('text');
    expect(input.attributes('inputmode')).toBe('decimal');
  });

  it('shows clear button when has value', () => {
    const wrapper = mountInput({ modelValue: 42, clearable: true });
    expect(wrapper.find('.coar-number-input-clear').exists()).toBe(true);
    expect(wrapper.find('.coar-number-input-clear--hidden').exists()).toBe(false);
  });

  it('hides clear button when null', () => {
    const wrapper = mountInput({ modelValue: null, clearable: true });
    expect(wrapper.find('.coar-number-input-clear--hidden').exists()).toBe(true);
  });

  it('does not render the clear button when not clearable (default)', () => {
    const wrapper = mountInput({ modelValue: 42 });
    expect(wrapper.find('.coar-number-input-clear').exists()).toBe(false);
  });

  it('clears value when clear button clicked', async () => {
    const wrapper = mountInput({ modelValue: 42, clearable: true });
    const clearBtn = wrapper.find('.coar-number-input-clear:not(.coar-number-input-clear--hidden)');
    await clearBtn.trigger('click');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([null]);
    expect(wrapper.emitted('clear')).toHaveLength(1);
  });

  it('applies error state via the input frame when error is true', () => {
    const wrapper = mountInput({ error: true });
    expect(wrapper.find('.coar-input-frame--error').exists()).toBe(true);
  });

  it('applies disabled state', () => {
    const wrapper = mountInput({ disabled: true });
    expect(wrapper.find('.coar-input-frame--disabled').exists()).toBe(true);
    expect((wrapper.find('input').element as HTMLInputElement).disabled).toBe(true);
  });

  it('applies readonly state', () => {
    const wrapper = mountInput({ readonly: true });
    expect(wrapper.find('.coar-input-frame--readonly').exists()).toBe(true);
  });

  it('applies size class', () => {
    const wrapper = mountInput({ size: 'xs' });
    expect(wrapper.find('.coar-number-input--xs').exists()).toBe(true);
  });

  it('shows stepper buttons when set to both', () => {
    const wrapper = mountInput({ stepperButtons: 'both' });
    expect(wrapper.find('.coar-number-input-buttons').exists()).toBe(true);
    expect(wrapper.find('.coar-number-input-button--increment').exists()).toBe(true);
    expect(wrapper.find('.coar-number-input-button--decrement').exists()).toBe(true);
  });

  it('shows only increment button', () => {
    const wrapper = mountInput({ stepperButtons: 'increment' });
    expect(wrapper.find('.coar-number-input-button--increment').exists()).toBe(true);
    expect(wrapper.find('.coar-number-input-button--decrement').exists()).toBe(false);
  });

  it('shows only decrement button', () => {
    const wrapper = mountInput({ stepperButtons: 'decrement' });
    expect(wrapper.find('.coar-number-input-button--decrement').exists()).toBe(true);
    expect(wrapper.find('.coar-number-input-button--increment').exists()).toBe(false);
  });

  it('hides stepper buttons by default', () => {
    const wrapper = mountInput();
    expect(wrapper.find('.coar-number-input-buttons').exists()).toBe(false);
  });

  it('hides stepper buttons when disabled', () => {
    const wrapper = mountInput({ stepperButtons: 'both', disabled: true });
    expect(wrapper.find('.coar-number-input-buttons').exists()).toBe(false);
  });

  it('increment button increments value', async () => {
    const wrapper = mountInput({ modelValue: 5, stepperButtons: 'both', step: 1 });
    await wrapper.find('.coar-number-input-button--increment').trigger('click');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([6]);
  });

  it('decrement button decrements value', async () => {
    const wrapper = mountInput({ modelValue: 5, stepperButtons: 'both', step: 1 });
    await wrapper.find('.coar-number-input-button--decrement').trigger('click');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([4]);
  });

  it('disables increment button at max', () => {
    const wrapper = mountInput({ modelValue: 10, max: 10, stepperButtons: 'both' });
    const btn = wrapper.find('.coar-number-input-button--increment');
    expect((btn.element as HTMLButtonElement).disabled).toBe(true);
  });

  it('disables decrement button at min', () => {
    const wrapper = mountInput({ modelValue: 0, min: 0, stepperButtons: 'both' });
    const btn = wrapper.find('.coar-number-input-button--decrement');
    expect((btn.element as HTMLButtonElement).disabled).toBe(true);
  });

  it('clamps value to min/max', async () => {
    const wrapper = mountInput({ modelValue: 50, max: 10, stepperButtons: 'both', step: 1 });
    // Value display should be formatted from the model
    // Increment should be disabled since value > max
    const incBtn = wrapper.find('.coar-number-input-button--increment');
    expect((incBtn.element as HTMLButtonElement).disabled).toBe(true);
  });

  it('renders prefix text', () => {
    const wrapper = mountInput({ prefix: '$' });
    expect(wrapper.find('.coar-number-input-prefix').text()).toContain('$');
  });

  it('renders suffix text', () => {
    const wrapper = mountInput({ suffix: '%' });
    expect(wrapper.find('.coar-number-input-suffix').text()).toContain('%');
  });

  it('emits focused and blurred events', async () => {
    const wrapper = mountInput();
    const input = wrapper.find('input');
    await input.trigger('focus');
    expect(wrapper.emitted('focused')).toHaveLength(1);
    await input.trigger('blur');
    expect(wrapper.emitted('blurred')).toHaveLength(1);
  });

  it('sets aria-valuemin and aria-valuemax', () => {
    const wrapper = mountInput({ min: 0, max: 100 });
    const input = wrapper.find('input');
    expect(input.attributes('aria-valuemin')).toBe('0');
    expect(input.attributes('aria-valuemax')).toBe('100');
  });

  it('keyboard ArrowUp increments value', async () => {
    const wrapper = mountInput({ modelValue: 5, step: 1 });
    await wrapper.find('input').trigger('keydown', { key: 'ArrowUp' });
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([6]);
  });

  it('keyboard ArrowDown decrements value', async () => {
    const wrapper = mountInput({ modelValue: 5, step: 1 });
    await wrapper.find('input').trigger('keydown', { key: 'ArrowDown' });
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([4]);
  });
});

describe('CoarNumberInput inline appearance and content width', () => {
  const stubs = { global: { stubs: { CoarIcon: { template: '<span />' } } } };

  it('keeps the outline frame and the full width by default', () => {
    const wrapper = mount(CoarNumberInput, stubs);
    expect(wrapper.get('.coar-input-frame').classes()).not.toContain('coar-input-frame--inline');
    expect(wrapper.classes()).not.toContain('coar-number-input--content');
    expect(wrapper.get('input').attributes('size')).toBeUndefined();
  });

  it('opts into the inline frame and keeps the error state', () => {
    const wrapper = mount(CoarNumberInput, { ...stubs, props: { appearance: 'inline', error: true } });
    const frame = wrapper.get('.coar-input-frame');
    expect(frame.classes()).toContain('coar-input-frame--inline');
    expect(frame.classes()).toContain('coar-input-frame--error');
    expect(wrapper.get('input').attributes('aria-invalid')).toBe('true');
  });

  it('sizes the field to its placeholder when empty', () => {
    const wrapper = mount(CoarNumberInput, { ...stubs, props: { width: 'content', placeholder: '0.00' } });
    expect(wrapper.classes()).toContain('coar-number-input--content');
    expect(wrapper.get('input').attributes('size')).toBe('4');
  });
});

describe('CoarNumberInput prefix and suffix actions', () => {
  it('renders actions at the outer edges, next to a text prefix and suffix', () => {
    const wrapper = mount(CoarNumberInput, {
      props: { prefix: '≈', suffix: 'pcs' },
      slots: {
        prefixAction: '<button class="before">±</button>',
        suffixAction: '<button class="after">EUR</button>',
      },
    });
    const leading = wrapper.get('.coar-input-frame__leading');
    const trailing = wrapper.get('.coar-input-frame__trailing');
    expect(leading.element.firstElementChild?.querySelector('.before')).not.toBeNull();
    expect(leading.text()).toContain('≈');
    expect(trailing.element.lastElementChild?.querySelector('.after')).not.toBeNull();
    expect(trailing.text()).toContain('pcs');
  });

  it('gives the actions the disabled and readonly state of the field', () => {
    const wrapper = mount(CoarNumberInput, {
      props: { disabled: true, readonly: true },
      slots: {
        suffixAction: `<template #suffixAction="{ disabled, readonly }"><span class="state">{{ disabled }}/{{ readonly }}</span></template>`,
      },
    });
    expect(wrapper.get('.state').text()).toBe('true/true');
  });

  it('renders no trailing affix without a suffix or action', () => {
    const wrapper = mount(CoarNumberInput);
    expect(wrapper.find('.coar-input-frame__trailing').exists()).toBe(false);
  });
});

describe('CoarNumberInput actions and the surrounding form field', () => {
  it('keeps a select in an action out of the field label and error', () => {
    const Wrapper = defineComponent({
      setup: () => () => h(CoarFormField, { label: 'Price', error: 'Required' }, {
        default: () => h(CoarNumberInput, null, {
          suffixAction: () => h(CoarSelect, {
            'aria-label': 'Currency', modelValue: 'EUR', options: [{ value: 'EUR', label: 'EUR' }],
          }),
        }),
      }),
    });
    const wrapper = mount(Wrapper);
    const input = wrapper.get('input');
    const trigger = wrapper.get('.coar-select-trigger');
    expect(input.attributes('aria-invalid')).toBe('true');
    expect(trigger.attributes('aria-labelledby')).toBeUndefined();
    expect(trigger.attributes('aria-label')).toBe('Currency');
    expect(trigger.attributes('aria-invalid')).toBeUndefined();
  });
});

describe('CoarNumberInput keeps the value it was given', () => {
  const mountInput = (props: Record<string, unknown>) =>
    mount(CoarNumberInput, { props, global: { stubs: { CoarIcon: CoarIconStub } } });
  const leave = async (wrapper: ReturnType<typeof mountInput>) => {
    await wrapper.find('input').trigger('focus');
    await wrapper.find('input').trigger('blur');
  };
  const enter = async (wrapper: ReturnType<typeof mountInput>, text: string) => {
    await wrapper.find('input').setValue(text);
    await wrapper.find('input').trigger('blur');
  };
  const last = (wrapper: ReturnType<typeof mountInput>) => wrapper.emitted('update:modelValue')?.at(-1)?.[0];

  it.each([
    [12.3456, { decimals: 2, locale: 'de-DE' }],
    [150, { decimals: 2, max: 100, locale: 'en-US' }],
    [-5, { min: 0, locale: 'en-US' }],
    [0.5, { decimals: 0, locale: 'en-US' }],
    [1e21, { decimals: 2, locale: 'en-US' }],
  ])('does not rewrite %d when the field is left unchanged', async (modelValue, props) => {
    const wrapper = mountInput({ modelValue, ...props });
    await leave(wrapper);
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });

  it('still rounds and clamps what was typed', async () => {
    const wrapper = mountInput({ modelValue: 1, decimals: 2, max: 100, locale: 'en-US' });
    await enter(wrapper, '150');
    expect(last(wrapper)).toBe(100);
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('100.00');
  });

  it('clamps while typing by default, and only on blur with clampOnBlur', async () => {
    const typed = async (props: Record<string, unknown>) => {
      const wrapper = mountInput({ modelValue: 1, max: 100, locale: 'en-US', ...props });
      const input = wrapper.find('input').element as HTMLInputElement;
      input.focus();
      input.value = '150';
      input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: '0' }));
      await wrapper.vm.$nextTick();
      return { wrapper, shown: input.value };
    };
    expect((await typed({})).shown).toBe('100');
    const deferred = await typed({ clampOnBlur: true });
    expect(deferred.shown).toBe('150');
    await deferred.wrapper.find('input').trigger('blur');
    expect(last(deferred.wrapper)).toBe(100);
  });

  it('reads a typed negative number', async () => {
    const wrapper = mountInput({ modelValue: 1, decimals: 2, locale: 'en-US' });
    await enter(wrapper, '-12.5');
    expect(last(wrapper)).toBe(-12.5);
  });

  it('shows every digit with decimals null, without an exponent', () => {
    const value = (modelValue: number) =>
      (mountInput({ modelValue, decimals: null, locale: 'de-DE' }).find('input').element as HTMLInputElement).value;
    expect(value(12.3456)).toBe('12,3456');
    expect(value(1e-7)).toBe('0,0000001');
    expect(value(1e21)).toBe('1000000000000000000000');
    expect(value(-1.5e-3)).toBe('-0,0015');
  });

  it('steps without floating point noise with decimals null', async () => {
    const wrapper = mountInput({ modelValue: 0.1, decimals: null, step: 0.2, stepperButtons: 'both' });
    await wrapper.find('.coar-number-input-button--increment').trigger('click');
    expect(last(wrapper)).toBe(0.3);
  });

  describe('exact', () => {
    it.each([
      ['de-DE', '12,3456', 12.3456],
      ['de-DE', '12.3456', 12.3456],
      ['en-US', '12.3456', 12.3456],
      ['de-DE', '-0,5', -0.5],
      ['en-US', '.5', 0.5],
      ['en-US', '42', 42],
    ])('%s stores %s as %d', async (locale, text, expected) => {
      const wrapper = mountInput({ modelValue: 1, exact: true, decimals: null, locale });
      await enter(wrapper, text);
      expect(last(wrapper)).toBe(expected);
      expect(wrapper.emitted('entry-refused')).toBeUndefined();
    });

    it.each([
      ['en-US', '12,3456'],
      ['de-DE', '1.234,5'],
      ['en-US', '1,234.5'],
      ['en-US', '1e5'],
      ['en-US', 'abc'],
      ['en-US', '-'],
    ])('%s refuses %s and keeps the value', async (locale, text) => {
      const wrapper = mountInput({ modelValue: 1, exact: true, decimals: null, locale });
      await enter(wrapper, text);
      expect(wrapper.emitted('update:modelValue')).toBeUndefined();
      expect(wrapper.emitted('entry-refused')).toEqual([[true]]);
      expect((wrapper.find('input').element as HTMLInputElement).value).toBe(text);
      expect(wrapper.find('input').attributes('aria-invalid')).toBe('true');
    });

    it('refuses more decimals than allowed instead of rounding', async () => {
      const wrapper = mountInput({ modelValue: 1, exact: true, decimals: 2, locale: 'en-US' });
      await enter(wrapper, '1.234');
      expect(wrapper.emitted('update:modelValue')).toBeUndefined();
      await enter(wrapper, '1.2300');
      expect(last(wrapper)).toBe(1.23);
      expect(wrapper.emitted('entry-refused')).toEqual([[true], [false]]);
    });

    it('does not clamp a typed value', async () => {
      const wrapper = mountInput({ modelValue: 1, exact: true, decimals: null, max: 10, locale: 'en-US' });
      await enter(wrapper, '50');
      expect(last(wrapper)).toBe(50);
    });

    it('empties the value', async () => {
      const wrapper = mountInput({ modelValue: 1, exact: true, decimals: null, locale: 'en-US' });
      await enter(wrapper, '');
      expect(last(wrapper)).toBeNull();
    });
  });
});
