import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import CoarFormField from '../form-field/CoarFormField.vue';
import CoarSelect from '../select/CoarSelect.vue';
import CoarTextInput from './CoarTextInput.vue';

// Provide a stub for CoarIcon
const CoarIconStub = { template: '<span class="icon-stub" />' };

describe('CoarTextInput', () => {
  const mountInput = (props = {}, slots = {}) =>
    mount(CoarTextInput, {
      props,
      slots,
      global: { stubs: { CoarIcon: CoarIconStub } },
    });

  it('renders with default props', () => {
    const wrapper = mountInput();
    expect(wrapper.find('.coar-text-input-host').exists()).toBe(true);
    expect(wrapper.find('input.coar-text-input-field').exists()).toBe(true);
  });

  it('defaults to type="text"', () => {
    const wrapper = mountInput();
    expect(wrapper.find('input').attributes('type')).toBe('text');
  });

  it.each(['email', 'url', 'tel', 'search'] as const)('renders type="%s"', (type) => {
    const wrapper = mountInput({ type });
    expect(wrapper.find('input').attributes('type')).toBe(type);
  });

  it('renders textarea when rows > 1', () => {
    const wrapper = mountInput({ rows: 3 });
    expect(wrapper.find('textarea.coar-text-input-field').exists()).toBe(true);
    expect(wrapper.find('input.coar-text-input-field').exists()).toBe(false);
  });

  it('applies size class', () => {
    const wrapper = mountInput({ size: 'l' });
    expect(wrapper.find('.coar-text-input--l').exists()).toBe(true);
  });

  it('applies multiline class for textarea', () => {
    const wrapper = mountInput({ rows: 4 });
    expect(wrapper.find('.coar-text-input--multiline').exists()).toBe(true);
  });

  it('v-model works', async () => {
    const wrapper = mountInput({ modelValue: 'hello' });
    const input = wrapper.find('input');
    expect((input.element as HTMLInputElement).value).toBe('hello');

    await input.setValue('world');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['world']);
  });

  it('emits focused and blurred events', async () => {
    const wrapper = mountInput();
    const input = wrapper.find('input');
    await input.trigger('focus');
    expect(wrapper.emitted('focused')).toHaveLength(1);
    await input.trigger('blur');
    expect(wrapper.emitted('blurred')).toHaveLength(1);
  });

  it('shows clear button when clearable and has value', async () => {
    const wrapper = mountInput({ modelValue: 'text', clearable: true });
    const clear = wrapper.find('.coar-text-input-clear');
    expect(clear.exists()).toBe(true);
    expect(clear.classes()).not.toContain('coar-text-input-clear--hidden');
  });

  it('keeps the clear-button slot but hides it when empty (no resize on first keystroke)', () => {
    const wrapper = mountInput({ modelValue: '', clearable: true });
    const clear = wrapper.find('.coar-text-input-clear');
    expect(clear.exists()).toBe(true);
    expect(clear.classes()).toContain('coar-text-input-clear--hidden');
  });

  it('renders no clear-button slot when not clearable', () => {
    const wrapper = mountInput({ modelValue: 'text', clearable: false });
    expect(wrapper.find('.coar-text-input-clear').exists()).toBe(false);
  });

  it('hides clear button when disabled', () => {
    const wrapper = mountInput({ modelValue: 'text', clearable: true, disabled: true });
    expect(wrapper.find('.coar-text-input-clear').exists()).toBe(false);
  });

  it('clears value when clear button clicked', async () => {
    const wrapper = mountInput({ modelValue: 'text', clearable: true });
    await wrapper.find('.coar-text-input-clear').trigger('click');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['']);
    expect(wrapper.emitted('clear')).toHaveLength(1);
  });

  it('applies error state via the input frame when error is true', () => {
    const wrapper = mountInput({ error: true });
    expect(wrapper.find('.coar-input-frame--error').exists()).toBe(true);
  });

  it('renders prefix text', () => {
    const wrapper = mountInput({ prefix: '$' });
    expect(wrapper.find('.coar-text-input-prefix').text()).toContain('$');
  });

  it('renders suffix text', () => {
    const wrapper = mountInput({ suffix: 'kg' });
    expect(wrapper.find('.coar-text-input-suffix').text()).toContain('kg');
  });

  it('applies disabled state', () => {
    const wrapper = mountInput({ disabled: true });
    expect(wrapper.find('.coar-input-frame--disabled').exists()).toBe(true);
    expect((wrapper.find('input').element as HTMLInputElement).disabled).toBe(true);
  });

  it('applies readonly state', () => {
    const wrapper = mountInput({ readonly: true });
    expect(wrapper.find('.coar-input-frame--readonly').exists()).toBe(true);
    expect((wrapper.find('input').element as HTMLInputElement).readOnly).toBe(true);
  });

  it('applies placeholder', () => {
    const wrapper = mountInput({ placeholder: 'Type here...' });
    expect((wrapper.find('input').element as HTMLInputElement).placeholder).toBe('Type here...');
  });

  it('applies maxlength', () => {
    const wrapper = mountInput({ maxlength: 50 });
    expect(wrapper.find('input').attributes('maxlength')).toBe('50');
  });

  it('hides prefix/suffix in multiline mode', () => {
    const wrapper = mountInput({ rows: 3, prefix: '$', suffix: 'kg' });
    expect(wrapper.find('.coar-text-input-prefix').exists()).toBe(false);
    expect(wrapper.find('.coar-text-input-suffix').exists()).toBe(false);
  });

  it('applies aria-invalid on error', () => {
    const wrapper = mountInput({ error: true });
    expect(wrapper.find('input').attributes('aria-invalid')).toBe('true');
  });

  it('does not set aria-invalid without error', () => {
    const wrapper = mountInput();
    expect(wrapper.find('input').attributes('aria-invalid')).toBeUndefined();
  });
});

describe('CoarTextInput inline appearance and content width', () => {
  it('keeps the outline frame and the full width by default', () => {
    const wrapper = mount(CoarTextInput, { props: { placeholder: 'Name' } });
    expect(wrapper.get('.coar-input-frame').classes()).not.toContain('coar-input-frame--inline');
    expect(wrapper.classes()).not.toContain('coar-text-input--content');
    expect(wrapper.get('input').attributes('size')).toBeUndefined();
  });

  it.each([1, 3])('opts into the inline frame with %i rows and keeps the error state', (rows) => {
    const wrapper = mount(CoarTextInput, { props: { rows, appearance: 'inline', error: true } });
    const frame = wrapper.get('.coar-input-frame');
    expect(frame.classes()).toContain('coar-input-frame--inline');
    expect(frame.classes()).toContain('coar-input-frame--error');
  });

  it('keeps disabled and readonly on the inline frame', () => {
    const wrapper = mount(CoarTextInput, { props: { appearance: 'inline', disabled: true, readonly: true } });
    const frame = wrapper.get('.coar-input-frame');
    expect(frame.classes()).toEqual(expect.arrayContaining([
      'coar-input-frame--inline', 'coar-input-frame--disabled', 'coar-input-frame--readonly',
    ]));
  });

  it('sizes a single line to its value, else to its placeholder', async () => {
    const wrapper = mount(CoarTextInput, { props: { width: 'content', placeholder: 'Product name' } });
    expect(wrapper.classes()).toContain('coar-text-input--content');
    expect(wrapper.get('input').attributes('size')).toBe('12');
    await wrapper.setProps({ modelValue: 'Lamp' });
    expect(wrapper.get('input').attributes('size')).toBe('4');
  });

  it('ignores content width for a textarea', () => {
    const wrapper = mount(CoarTextInput, { props: { width: 'content', rows: 2 } });
    expect(wrapper.classes()).not.toContain('coar-text-input--content');
    expect(wrapper.find('textarea').exists()).toBe(true);
  });
});

describe('CoarTextInput prefix and suffix actions', () => {
  it('renders a prefix action before the text prefix and passes the field state', () => {
    const wrapper = mount(CoarTextInput, {
      props: { prefix: '@', disabled: true },
      slots: {
        prefixAction: `<template #prefixAction="{ disabled, readonly }"><button class="before">{{ disabled }}/{{ readonly }}</button></template>`,
      },
    });
    const leading = wrapper.get('.coar-input-frame__leading');
    expect(leading.element.firstElementChild?.querySelector('.before')).not.toBeNull();
    expect(leading.text()).toContain('@');
    expect(wrapper.get('.before').text()).toBe('true/false');
  });

  it('passes the field state to a suffix action', () => {
    const wrapper = mount(CoarTextInput, {
      props: { readonly: true },
      slots: {
        suffixAction: `<template #suffixAction="{ disabled, readonly }"><button class="after">{{ disabled }}/{{ readonly }}</button></template>`,
      },
    });
    expect(wrapper.get('.after').text()).toBe('false/true');
  });
});

describe('CoarTextInput actions and the surrounding form field', () => {
  it('keeps a select in an action out of the field label and error', () => {
    const Wrapper = defineComponent({
      setup: () => () => h(CoarFormField, { label: 'Price', error: 'Required' }, {
        default: () => h(CoarTextInput, null, {
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
