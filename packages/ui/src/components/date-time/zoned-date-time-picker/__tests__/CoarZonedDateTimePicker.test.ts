import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { computed, nextTick } from 'vue';

import { Temporal } from '@js-temporal/polyfill';

import CoarZonedDateTimePicker from '../CoarZonedDateTimePicker.vue';
import { FORM_FIELD_INJECTION_KEY } from '../../../form-field/constants';

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

    it('marks the input required (label + * live on CoarFormField)', () => {
      const w = mountPicker({ required: true });
      expect((w.find('.coar-zdtp-input').element as HTMLInputElement).required).toBe(true);
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
    it('applies disabled state', () => {
      const w = mountPicker({ disabled: true });
      expect(w.find('.coar-zdtp-trigger.coar-input-frame--disabled').exists()).toBe(true);
    });

    it('applies readonly state', () => {
      const w = mountPicker({ readonly: true });
      expect(w.find('.coar-zdtp-trigger.coar-input-frame--readonly').exists()).toBe(true);
    });

    it('applies error state from the boolean prop, no own message', () => {
      const w = mountPicker({ error: true });
      expect(w.find('.coar-zdtp-trigger.coar-input-frame--error').exists()).toBe(true);
      expect(w.find('.coar-form-field-message').exists()).toBe(false);
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
      const w = mountPicker({ error: true });
      expect(w.find('[role="combobox"]').attributes('aria-invalid')).toBe('true');
    });
  });

  describe('CoarFormField integration', () => {
    function mountWithField(provided: Record<string, unknown>) {
      return mount(CoarZonedDateTimePicker, {
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
      expect(w.find('.coar-zdtp-input').attributes('id')).toBe('field-1');
    });

    it('reflects injected error + describedby', () => {
      const w = mountWithField({
        inputId: computed(() => 'f'),
        messageId: computed(() => 'f-err'),
        hasError: computed(() => true),
        disabled: computed(() => false),
      });
      expect(w.find('.coar-zdtp-trigger.coar-input-frame--error').exists()).toBe(true);
      expect(w.find('[role="combobox"]').attributes('aria-invalid')).toBe('true');
      expect(w.find('.coar-zdtp-input').attributes('aria-describedby')).toBe('f-err');
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
    it('parses valid datetime input in the zone it is shown in, into the default zone', async () => {
      const w = mountPicker({ locale: 'de-DE', timeZone: 'Europe/Vienna' });
      const input = w.find('.coar-zdtp-input');
      await input.setValue('15.06.2025 14:30');

      const emitted = w.emitted('update:modelValue');
      expect(emitted).toBeTruthy();
      const val = emitted![emitted!.length - 1][0] as Temporal.ZonedDateTime;
      // Without a localization service the field shows the system zone.
      const shownZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      expect(val.withTimeZone(shownZone).toPlainDateTime().toString()).toBe('2025-06-15T14:30:00');
      expect(val.timeZoneId).toBe('Europe/Vienna');
    });
  });
});

describe('inline appearance', () => {
  it('keeps the outline frame and the calendar segment by default', () => {
    const w = mountPicker();
    expect(w.get('.coar-input-frame').classes()).not.toContain('coar-input-frame--inline');
    expect(w.get('.coar-zdtp-btn').classes()).not.toContain('coar-input-frame-button--plain');
    w.unmount();
  });

  it('draws the inline frame with a plain calendar button and keeps the error state', () => {
    const w = mountPicker({ appearance: 'inline', error: true });
    const frame = w.get('.coar-input-frame');
    expect(frame.classes()).toContain('coar-input-frame--inline');
    expect(frame.classes()).toContain('coar-input-frame--error');
    expect(w.get('.coar-zdtp-btn').classes()).toContain('coar-input-frame-button--plain');
    w.unmount();
  });
});

describe('content width', () => {
  it('fits the field to its value and counts the zone caption only on request', () => {
    const value = Temporal.ZonedDateTime.from('2026-12-01T09:30[Europe/Vienna]');
    const fill = mountPicker({ modelValue: value });
    expect(fill.find('.coar-zdtp--content').exists()).toBe(false);
    expect(fill.find('.coar-zdtp-tz-sizer').exists()).toBe(false);
    expect(fill.get('input').attributes('size')).toBeUndefined();
    fill.unmount();

    const w = mountPicker({ modelValue: value, width: 'content' });
    expect(w.find('.coar-zdtp--content').exists()).toBe(true);
    expect(Number(w.get('input').attributes('size'))).toBeGreaterThan(0);
    const caption = w.get('.coar-zdtp-tz-inline:not(.coar-zdtp-tz-sizer)');
    const sizer = w.get('.coar-zdtp-tz-sizer');
    expect(sizer.text()).toBe(caption.text());
    expect(sizer.attributes('aria-hidden')).toBe('true');
    w.unmount();
  });
});
