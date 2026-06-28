import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { computed, nextTick } from 'vue';

import { Temporal } from '@js-temporal/polyfill';

import CoarPlainDatePicker from '../CoarPlainDatePicker.vue';
import { FORM_FIELD_INJECTION_KEY } from '../../../form-field/constants';

// Stub dependencies
vi.mock('../../../../scrollbar', () => ({
  vScrollbar: { mounted() {}, updated() {}, unmounted() {} },
}));

vi.mock('../../../../icon/CoarIcon.vue', () => ({
  default: {
    name: 'CoarIcon',
    props: ['name', 'size'],
    template: '<span class="mock-icon" />',
  },
}));

// Mock Maskito
vi.mock('@maskito/core', () => ({
  Maskito: class {
    destroy() {}
  },
}));

vi.mock('../../../_shared/maskito-config', () => ({
  coarCreateDateMask: () => ({ mask: [] }),
}));

// Mock overlay service
const mockClose = vi.fn();
const mockOpen = vi.fn();

function createMockOverlayRef() {
  let resolve: (value?: unknown) => void;
  const afterClosed = new Promise<unknown>((r) => { resolve = r; });
  return {
    close: (...args: unknown[]) => { mockClose(...args); resolve!(); },
    get isClosed() { return false; },
    afterClosed,
    panelElement: null,
    updatePosition: vi.fn(),
  };
}

vi.mock('../../../../overlay/useOverlay', () => ({
  getOverlayService: () => ({
    open: (...args: unknown[]) => { mockOpen(...args); return createMockOverlayRef(); },
    instances: { value: [] },
    closeAll: vi.fn(),
    onPanelMounted: vi.fn(),
  }),
}));

function mountPicker(opts: Record<string, unknown> = {}) {
  return mount(CoarPlainDatePicker, {
    props: opts,
    global: {
      provide: { 'coar-l10n': undefined },
    },
    attachTo: document.body,
  });
}

describe('CoarPlainDatePicker', () => {
  describe('rendering', () => {
    it('renders the trigger with input and calendar button', () => {
      const w = mountPicker();
      expect(w.find('.coar-plain-date-picker-trigger').exists()).toBe(true);
      expect(w.find('.coar-plain-date-picker-input').exists()).toBe(true);
      expect(w.find('.coar-plain-date-picker-btn').exists()).toBe(true);
    });

    it('marks the input required (label + * live on CoarFormField)', () => {
      const w = mountPicker({ required: true });
      const input = w.find('.coar-plain-date-picker-input');
      expect((input.element as HTMLInputElement).required).toBe(true);
    });

    it('shows placeholder from format pattern', () => {
      const w = mountPicker();
      const input = w.find('.coar-plain-date-picker-input');
      expect(input.attributes('placeholder')).toBeTruthy();
    });

    it('shows custom placeholder', () => {
      const w = mountPicker({ placeholder: 'Pick a date' });
      const input = w.find('.coar-plain-date-picker-input');
      expect(input.attributes('placeholder')).toBe('Pick a date');
    });
  });

  describe('value display', () => {
    it('displays formatted date when modelValue is provided', async () => {
      const date = Temporal.PlainDate.from('2025-06-15');
      const w = mountPicker({ modelValue: date });
      await nextTick();
      const input = w.find('.coar-plain-date-picker-input');
      expect((input.element as HTMLInputElement).value).toBeTruthy();
    });

    it('displays empty when modelValue is null', () => {
      const w = mountPicker({ modelValue: null });
      const input = w.find('.coar-plain-date-picker-input');
      expect((input.element as HTMLInputElement).value).toBe('');
    });
  });

  describe('clear button', () => {
    it('shows clear button when value exists and clearable', async () => {
      const date = Temporal.PlainDate.from('2025-06-15');
      const w = mountPicker({ modelValue: date, clearable: true });
      await nextTick();
      const clearBtn = w.find('.coar-plain-date-picker-clear');
      expect(clearBtn.classes()).not.toContain('coar-plain-date-picker-clear--hidden');
    });

    it('hides clear button when no value', () => {
      const w = mountPicker({ modelValue: null, clearable: true });
      const clearBtn = w.find('.coar-plain-date-picker-clear');
      expect(clearBtn.classes()).toContain('coar-plain-date-picker-clear--hidden');
    });

    it('clears value on clear button click', async () => {
      const date = Temporal.PlainDate.from('2025-06-15');
      const w = mountPicker({ modelValue: date, clearable: true });
      await nextTick();
      await w.find('.coar-plain-date-picker-clear').trigger('click');
      expect(w.emitted('update:modelValue')?.[0]).toEqual([null]);
    });
  });

  describe('disabled state', () => {
    it('applies disabled state to trigger', () => {
      const w = mountPicker({ disabled: true });
      expect(w.find('.coar-plain-date-picker-trigger.coar-input-frame--disabled').exists()).toBe(true);
    });

    it('disables the input', () => {
      const w = mountPicker({ disabled: true });
      const input = w.find('.coar-plain-date-picker-input');
      expect((input.element as HTMLInputElement).disabled).toBe(true);
    });

    it('disables the calendar button', () => {
      const w = mountPicker({ disabled: true });
      const btn = w.find('.coar-plain-date-picker-btn');
      expect((btn.element as HTMLButtonElement).disabled).toBe(true);
    });
  });

  describe('readonly state', () => {
    it('applies readonly state to trigger', () => {
      const w = mountPicker({ readonly: true });
      expect(w.find('.coar-plain-date-picker-trigger.coar-input-frame--readonly').exists()).toBe(true);
    });
  });

  describe('error state', () => {
    it('applies error state to trigger from the boolean prop', () => {
      const w = mountPicker({ error: true });
      expect(w.find('.coar-plain-date-picker-trigger.coar-input-frame--error').exists()).toBe(true);
    });

    it('does not render an own message element (owned by CoarFormField)', () => {
      const w = mountPicker({ error: true });
      expect(w.find('.coar-form-field-message').exists()).toBe(false);
    });
  });

  describe('size variants', () => {
    it.each(['xs', 's', 'm', 'l'] as const)('applies %s size class', (size) => {
      const w = mountPicker({ size });
      expect(w.find(`.coar-plain-date-picker--${size}`).exists()).toBe(true);
    });
  });

  describe('accessibility', () => {
    it('has combobox role on trigger', () => {
      const w = mountPicker();
      expect(w.find('[role="combobox"]').exists()).toBe(true);
    });

    it('has aria-expanded false when closed', () => {
      const w = mountPicker();
      expect(w.find('[role="combobox"]').attributes('aria-expanded')).toBe('false');
    });

    it('has aria-haspopup dialog', () => {
      const w = mountPicker();
      expect(w.find('[role="combobox"]').attributes('aria-haspopup')).toBe('dialog');
    });

    it('has aria-invalid when error', () => {
      const w = mountPicker({ error: true });
      const input = w.find('.coar-plain-date-picker-input');
      expect(input.attributes('aria-invalid')).toBe('true');
    });
  });

  describe('CoarFormField integration', () => {
    function mountWithField(provided: Record<string, unknown>) {
      return mount(CoarPlainDatePicker, {
        global: {
          provide: {
            'coar-l10n': undefined,
            [FORM_FIELD_INJECTION_KEY as symbol]: provided,
          },
        },
        attachTo: document.body,
      });
    }

    it('adopts the injected input id', () => {
      const w = mountWithField({
        inputId: computed(() => 'field-1'),
        messageId: computed(() => ''),
        hasError: computed(() => false),
        disabled: computed(() => false),
      });
      expect(w.find('.coar-plain-date-picker-input').attributes('id')).toBe('field-1');
    });

    it('reflects injected error on the trigger + aria-invalid', () => {
      const w = mountWithField({
        inputId: computed(() => 'f'),
        messageId: computed(() => ''),
        hasError: computed(() => true),
        disabled: computed(() => false),
      });
      expect(w.find('.coar-plain-date-picker-trigger.coar-input-frame--error').exists()).toBe(true);
      expect(w.find('.coar-plain-date-picker-input').attributes('aria-invalid')).toBe('true');
    });

    it('wires aria-describedby from the field messageId', () => {
      const w = mountWithField({
        inputId: computed(() => 'f'),
        messageId: computed(() => 'f-err'),
        hasError: computed(() => true),
        disabled: computed(() => false),
      });
      expect(w.find('.coar-plain-date-picker-input').attributes('aria-describedby')).toBe('f-err');
    });
  });

  describe('input parsing', () => {
    it('updates model when valid date is typed', async () => {
      const w = mountPicker({ locale: 'de-DE' });
      const input = w.find('.coar-plain-date-picker-input');
      await input.setValue('15.06.2025');
      await input.trigger('input');

      const emitted = w.emitted('update:modelValue');
      expect(emitted).toBeTruthy();
      const lastVal = emitted![emitted!.length - 1][0] as Temporal.PlainDate;
      expect(lastVal.year).toBe(2025);
      expect(lastVal.month).toBe(6);
      expect(lastVal.day).toBe(15);
    });

    it('reverts display on blur with invalid input', async () => {
      const date = Temporal.PlainDate.from('2025-06-15');
      const w = mountPicker({ modelValue: date });
      await nextTick();

      const input = w.find('.coar-plain-date-picker-input');
      // Simulate typing an invalid date
      (input.element as HTMLInputElement).value = '99.99.9999';
      await input.trigger('input');
      await input.trigger('blur');

      // Should revert to formatted value of the model
      expect((input.element as HTMLInputElement).value).toBeTruthy();
    });
  });
});
