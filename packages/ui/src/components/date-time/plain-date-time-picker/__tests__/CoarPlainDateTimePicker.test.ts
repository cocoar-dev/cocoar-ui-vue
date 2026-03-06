import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';

import { Temporal } from '@js-temporal/polyfill';

import CoarPlainDateTimePicker from '../CoarPlainDateTimePicker.vue';

// Stubs
vi.mock('../../../../scrollbar', () => ({
  vScrollbar: { mounted() {}, updated() {}, unmounted() {} },
}));

vi.mock('../../../../icon/CoarIcon.vue', () => ({
  default: { name: 'CoarIcon', props: ['name', 'size'], template: '<span class="mock-icon" />' },
}));

vi.mock('@maskito/core', () => ({
  Maskito: class { destroy() {} },
}));

vi.mock('../../../_shared/maskito-config', () => ({
  coarCreateDateTimeMask: () => ({ mask: [] }),
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
  return mount(CoarPlainDateTimePicker, {
    props: opts,
    global: {
      provide: { 'coar-l10n': undefined },
    },
    attachTo: document.body,
  });
}

describe('CoarPlainDateTimePicker', () => {
  describe('rendering', () => {
    it('renders trigger with input and button', () => {
      const w = mountPicker();
      expect(w.find('.coar-pdtp-trigger').exists()).toBe(true);
      expect(w.find('.coar-pdtp-input').exists()).toBe(true);
      expect(w.find('.coar-pdtp-btn').exists()).toBe(true);
    });

    it('renders label', () => {
      const w = mountPicker({ label: 'Appointment' });
      expect(w.find('.coar-pdtp-label').text()).toContain('Appointment');
    });

    it('renders required indicator', () => {
      const w = mountPicker({ label: 'Date', required: true });
      expect(w.find('.coar-pdtp-required').exists()).toBe(true);
    });

    it('shows placeholder with time format', () => {
      const w = mountPicker({ locale: 'de-DE' });
      const input = w.find('.coar-pdtp-input');
      const placeholder = input.attributes('placeholder');
      expect(placeholder).toBeTruthy();
      // Should contain HH:MM
      expect(placeholder!.toUpperCase()).toContain('HH:MM');
    });
  });

  describe('value display', () => {
    it('displays formatted datetime when modelValue is provided', async () => {
      const dt = Temporal.PlainDateTime.from('2025-06-15T14:30');
      const w = mountPicker({ modelValue: dt });
      await nextTick();
      const input = w.find('.coar-pdtp-input');
      expect((input.element as HTMLInputElement).value).toBeTruthy();
      // Should contain both date and time
      expect((input.element as HTMLInputElement).value).toContain(':');
    });

    it('displays empty when modelValue is null', () => {
      const w = mountPicker({ modelValue: null });
      expect((w.find('.coar-pdtp-input').element as HTMLInputElement).value).toBe('');
    });
  });

  describe('clear button', () => {
    it('shows when value exists', async () => {
      const dt = Temporal.PlainDateTime.from('2025-06-15T14:30');
      const w = mountPicker({ modelValue: dt, clearable: true });
      await nextTick();
      expect(w.find('.coar-pdtp-clear').classes()).not.toContain('coar-pdtp-clear--hidden');
    });

    it('hidden when no value', () => {
      const w = mountPicker({ modelValue: null, clearable: true });
      expect(w.find('.coar-pdtp-clear').classes()).toContain('coar-pdtp-clear--hidden');
    });

    it('clears value on click', async () => {
      const dt = Temporal.PlainDateTime.from('2025-06-15T14:30');
      const w = mountPicker({ modelValue: dt, clearable: true });
      await nextTick();
      await w.find('.coar-pdtp-clear').trigger('click');
      expect(w.emitted('update:modelValue')?.[0]).toEqual([null]);
    });
  });

  describe('disabled / readonly / error', () => {
    it('applies disabled class', () => {
      const w = mountPicker({ disabled: true });
      expect(w.find('.coar-pdtp-trigger--disabled').exists()).toBe(true);
    });

    it('applies readonly class', () => {
      const w = mountPicker({ readonly: true });
      expect(w.find('.coar-pdtp-trigger--readonly').exists()).toBe(true);
    });

    it('applies error class and shows message', () => {
      const w = mountPicker({ error: 'Invalid date' });
      expect(w.find('.coar-pdtp-trigger--error').exists()).toBe(true);
      expect(w.find('.coar-form-field-message--error').text()).toBe('Invalid date');
    });
  });

  describe('size variants', () => {
    it.each(['xs', 's', 'm', 'l'] as const)('applies %s size class', (size) => {
      const w = mountPicker({ size });
      expect(w.find(`.coar-pdtp--${size}`).exists()).toBe(true);
    });
  });

  describe('accessibility', () => {
    it('has combobox role', () => {
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
  });

  describe('input parsing', () => {
    it('parses valid datetime input', async () => {
      const w = mountPicker({ locale: 'de-DE' });
      const input = w.find('.coar-pdtp-input');
      await input.setValue('15.06.2025 14:30');

      const emitted = w.emitted('update:modelValue');
      expect(emitted).toBeTruthy();
      const val = emitted![emitted!.length - 1][0] as Temporal.PlainDateTime;
      expect(val.year).toBe(2025);
      expect(val.month).toBe(6);
      expect(val.day).toBe(15);
      expect(val.hour).toBe(14);
      expect(val.minute).toBe(30);
    });
  });
});
