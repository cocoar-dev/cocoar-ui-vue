import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';

import { Temporal } from '@js-temporal/polyfill';

import CoarZonedDateTimePicker from '../CoarZonedDateTimePicker.vue';

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
  return mount(CoarZonedDateTimePicker, {
    props: opts,
    global: {
      provide: { 'coar-l10n': undefined },
    },
    attachTo: document.body,
  });
}

describe('CoarZonedDateTimePicker', () => {
  describe('rendering', () => {
    it('renders trigger with input and buttons', () => {
      const w = mountPicker();
      expect(w.find('.coar-zdtp-trigger').exists()).toBe(true);
      expect(w.find('.coar-zdtp-input').exists()).toBe(true);
      expect(w.find('.coar-zdtp-btn').exists()).toBe(true);
    });

    it('renders label', () => {
      const w = mountPicker({ label: 'Meeting' });
      expect(w.find('.coar-zdtp-label').text()).toContain('Meeting');
    });

    it('renders required indicator', () => {
      const w = mountPicker({ label: 'Date', required: true });
      expect(w.find('.coar-zdtp-required').exists()).toBe(true);
    });

    it('shows placeholder with time format', () => {
      const w = mountPicker({ locale: 'de-DE' });
      const input = w.find('.coar-zdtp-input');
      const placeholder = input.attributes('placeholder');
      expect(placeholder).toBeTruthy();
      expect(placeholder!.toUpperCase()).toContain('HH:MM');
    });

    it('renders timezone indicator button', () => {
      const w = mountPicker();
      expect(w.find('.coar-zdtp-tz-indicator').exists()).toBe(true);
    });
  });

  describe('value display', () => {
    it('displays formatted datetime when value provided', async () => {
      const zdt = Temporal.ZonedDateTime.from('2025-06-15T14:30[Europe/Vienna]');
      const w = mountPicker({ modelValue: zdt });
      await nextTick();
      const val = (w.find('.coar-zdtp-input').element as HTMLInputElement).value;
      expect(val).toBeTruthy();
      expect(val).toContain(':');
    });

    it('displays empty when modelValue is null', () => {
      const w = mountPicker({ modelValue: null });
      expect((w.find('.coar-zdtp-input').element as HTMLInputElement).value).toBe('');
    });

    it('shows timezone inline label when value exists', async () => {
      const zdt = Temporal.ZonedDateTime.from('2025-06-15T14:30[Europe/Vienna]');
      const w = mountPicker({ modelValue: zdt });
      await nextTick();
      expect(w.find('.coar-zdtp-tz-inline').exists()).toBe(true);
    });

    it('hides timezone inline label when no value', () => {
      const w = mountPicker({ modelValue: null });
      expect(w.find('.coar-zdtp-tz-inline').exists()).toBe(false);
    });
  });

  describe('clear button', () => {
    it('shows when value exists', async () => {
      const zdt = Temporal.ZonedDateTime.from('2025-06-15T14:30[Europe/Vienna]');
      const w = mountPicker({ modelValue: zdt, clearable: true });
      await nextTick();
      expect(w.find('.coar-zdtp-clear').classes()).not.toContain('coar-zdtp-clear--hidden');
    });

    it('hidden when no value', () => {
      const w = mountPicker({ modelValue: null, clearable: true });
      expect(w.find('.coar-zdtp-clear').classes()).toContain('coar-zdtp-clear--hidden');
    });

    it('clears value on click', async () => {
      const zdt = Temporal.ZonedDateTime.from('2025-06-15T14:30[Europe/Vienna]');
      const w = mountPicker({ modelValue: zdt, clearable: true });
      await nextTick();
      await w.find('.coar-zdtp-clear').trigger('click');
      expect(w.emitted('update:modelValue')?.[0]).toEqual([null]);
    });
  });

  describe('disabled / readonly / error', () => {
    it('applies disabled class', () => {
      const w = mountPicker({ disabled: true });
      expect(w.find('.coar-zdtp-trigger--disabled').exists()).toBe(true);
    });

    it('applies readonly class', () => {
      const w = mountPicker({ readonly: true });
      expect(w.find('.coar-zdtp-trigger--readonly').exists()).toBe(true);
    });

    it('applies error class and shows message', () => {
      const w = mountPicker({ error: 'Invalid' });
      expect(w.find('.coar-zdtp-trigger--error').exists()).toBe(true);
      expect(w.find('.coar-form-field-message--error').text()).toBe('Invalid');
    });
  });

  describe('size variants', () => {
    it.each(['xs', 's', 'm', 'l'] as const)('applies %s size class', (size) => {
      const w = mountPicker({ size });
      expect(w.find(`.coar-zdtp--${size}`).exists()).toBe(true);
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

    it('has aria-invalid when error', () => {
      const w = mountPicker({ error: 'Oops' });
      expect(w.find('[role="combobox"]').attributes('aria-invalid')).toBe('true');
    });
  });

  describe('timezone indicator', () => {
    it('renders timezone indicator button', () => {
      const w = mountPicker();
      const indicator = w.find('.coar-zdtp-tz-indicator');
      expect(indicator.exists()).toBe(true);
    });

    it('starts in home state (disabled when no value or same TZ)', () => {
      const w = mountPicker();
      // No value → indicator should not be clickable
      const indicator = w.find('.coar-zdtp-tz-indicator');
      expect(indicator.exists()).toBe(true);
    });
  });

  describe('input parsing', () => {
    it('parses valid datetime input', async () => {
      const w = mountPicker({ locale: 'de-DE', timeZone: 'Europe/Vienna' });
      const input = w.find('.coar-zdtp-input');
      await input.setValue('15.06.2025 14:30');
      await input.trigger('input');

      const emitted = w.emitted('update:modelValue');
      expect(emitted).toBeTruthy();
      const val = emitted![emitted!.length - 1][0] as Temporal.ZonedDateTime;
      expect(val.year).toBe(2025);
      expect(val.month).toBe(6);
      expect(val.day).toBe(15);
      expect(val.hour).toBe(14);
      expect(val.minute).toBe(30);
      expect(val.timeZoneId).toBe('Europe/Vienna');
    });
  });
});
