import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, ref } from 'vue';

import CoarTimePicker from '../CoarTimePicker.vue';

// Helper to get spinbutton values from the wrapper
function getDisplayValues(wrapper: ReturnType<typeof mount>) {
  const spinbuttons = wrapper.findAll('[role="spinbutton"]');
  return spinbuttons.map((sb) => sb.text().trim());
}

function findSpinbutton(wrapper: ReturnType<typeof mount>, label: string) {
  return wrapper.find(`[aria-label="${label}"]`);
}

function findBtn(wrapper: ReturnType<typeof mount>, label: string) {
  return wrapper.find(`button[aria-label="${label}"]`);
}

describe('CoarTimePicker', () => {
  describe('rendering', () => {
    it('renders with default values', () => {
      const wrapper = mount(CoarTimePicker, { props: { use24Hour: true } });
      const values = getDisplayValues(wrapper);
      expect(values.length).toBe(2); // hours, minutes
      expect(values[0]).toBe('09');
      expect(values[1]).toBe('00');
    });

    it('renders AM/PM in 12-hour mode', () => {
      const wrapper = mount(CoarTimePicker, { props: { use24Hour: false } });
      const values = getDisplayValues(wrapper);
      expect(values.length).toBe(3); // hours, minutes, period
      expect(values[2]).toBe('AM');
    });

    it('hides AM/PM in 24-hour mode', () => {
      const wrapper = mount(CoarTimePicker, { props: { use24Hour: true } });
      expect(wrapper.find('.coar-time-picker__period').exists()).toBe(false);
    });

    it('displays modelValue correctly in 24h mode', () => {
      const wrapper = mount(CoarTimePicker, {
        props: { modelValue: { hours: 14, minutes: 30 }, use24Hour: true },
      });
      const values = getDisplayValues(wrapper);
      expect(values[0]).toBe('14');
      expect(values[1]).toBe('30');
    });

    it('displays modelValue correctly in 12h mode', () => {
      const wrapper = mount(CoarTimePicker, {
        props: { modelValue: { hours: 14, minutes: 30 }, use24Hour: false },
      });
      const values = getDisplayValues(wrapper);
      expect(values[0]).toBe('02');
      expect(values[1]).toBe('30');
      expect(values[2]).toBe('PM');
    });

    it('displays midnight correctly in 12h mode', () => {
      const wrapper = mount(CoarTimePicker, {
        props: { modelValue: { hours: 0, minutes: 0 }, use24Hour: false },
      });
      const values = getDisplayValues(wrapper);
      expect(values[0]).toBe('12');
      expect(values[2]).toBe('AM');
    });

    it('displays noon correctly in 12h mode', () => {
      const wrapper = mount(CoarTimePicker, {
        props: { modelValue: { hours: 12, minutes: 0 }, use24Hour: false },
      });
      const values = getDisplayValues(wrapper);
      expect(values[0]).toBe('12');
      expect(values[2]).toBe('PM');
    });
  });

  describe('hour increment/decrement', () => {
    it('increments hours in 24h mode', async () => {
      const wrapper = mount(CoarTimePicker, {
        props: { modelValue: { hours: 14, minutes: 0 }, use24Hour: true },
      });
      await findBtn(wrapper, 'Increase hours').trigger('click');
      const emitted = wrapper.emitted('update:modelValue');
      expect(emitted).toBeTruthy();
      expect(emitted![0][0]).toEqual({ hours: 15, minutes: 0 });
    });

    it('decrements hours in 24h mode', async () => {
      const wrapper = mount(CoarTimePicker, {
        props: { modelValue: { hours: 14, minutes: 0 }, use24Hour: true },
      });
      await findBtn(wrapper, 'Decrease hours').trigger('click');
      const emitted = wrapper.emitted('update:modelValue');
      expect(emitted![0][0]).toEqual({ hours: 13, minutes: 0 });
    });

    it('wraps 23 → 0 when incrementing hours in 24h mode', async () => {
      const wrapper = mount(CoarTimePicker, {
        props: { modelValue: { hours: 23, minutes: 0 }, use24Hour: true },
      });
      await findBtn(wrapper, 'Increase hours').trigger('click');
      const emitted = wrapper.emitted('update:modelValue');
      expect(emitted![0][0]).toEqual({ hours: 0, minutes: 0 });
    });

    it('wraps 0 → 23 when decrementing hours in 24h mode', async () => {
      const wrapper = mount(CoarTimePicker, {
        props: { modelValue: { hours: 0, minutes: 0 }, use24Hour: true },
      });
      await findBtn(wrapper, 'Decrease hours').trigger('click');
      const emitted = wrapper.emitted('update:modelValue');
      expect(emitted![0][0]).toEqual({ hours: 23, minutes: 0 });
    });
  });

  describe('minute increment/decrement', () => {
    it('increments minutes by step', async () => {
      const wrapper = mount(CoarTimePicker, {
        props: {
          modelValue: { hours: 9, minutes: 0 },
          use24Hour: true,
          minuteStep: 5,
        },
      });
      await findBtn(wrapper, 'Increase minutes').trigger('click');
      const emitted = wrapper.emitted('update:modelValue');
      expect(emitted![0][0]).toEqual({ hours: 9, minutes: 5 });
    });

    it('carries over hour when minutes wrap', async () => {
      const wrapper = mount(CoarTimePicker, {
        props: {
          modelValue: { hours: 9, minutes: 55 },
          use24Hour: true,
          minuteStep: 5,
        },
      });
      await findBtn(wrapper, 'Increase minutes').trigger('click');
      const emitted = wrapper.emitted('update:modelValue');
      expect(emitted![0][0]).toEqual({ hours: 10, minutes: 0 });
    });

    it('decrements minutes with carry-under', async () => {
      const wrapper = mount(CoarTimePicker, {
        props: {
          modelValue: { hours: 9, minutes: 0 },
          use24Hour: true,
          minuteStep: 5,
        },
      });
      await findBtn(wrapper, 'Decrease minutes').trigger('click');
      const emitted = wrapper.emitted('update:modelValue');
      expect(emitted![0][0]).toEqual({ hours: 8, minutes: 55 });
    });

    it('respects minuteStep of 15', async () => {
      const wrapper = mount(CoarTimePicker, {
        props: {
          modelValue: { hours: 9, minutes: 0 },
          use24Hour: true,
          minuteStep: 15,
        },
      });
      await findBtn(wrapper, 'Increase minutes').trigger('click');
      const emitted = wrapper.emitted('update:modelValue');
      expect(emitted![0][0]).toEqual({ hours: 9, minutes: 15 });
    });
  });

  describe('12-hour mode specifics', () => {
    it('toggles AM/PM', async () => {
      const wrapper = mount(CoarTimePicker, {
        props: { modelValue: { hours: 9, minutes: 0 }, use24Hour: false },
      });
      // Find and click the toggle button
      const toggleBtns = wrapper.findAll('button[aria-label="Toggle AM/PM"]');
      expect(toggleBtns.length).toBeGreaterThan(0);
      await toggleBtns[0].trigger('click');
      const emitted = wrapper.emitted('update:modelValue');
      expect(emitted![0][0]).toEqual({ hours: 21, minutes: 0 });
    });

    it('handles 12h boundary (11 AM → 12 PM)', async () => {
      const wrapper = mount(CoarTimePicker, {
        props: { modelValue: { hours: 11, minutes: 0 }, use24Hour: false },
      });
      await findBtn(wrapper, 'Increase hours').trigger('click');
      const emitted = wrapper.emitted('update:modelValue');
      // 11 AM + 1 → toggles to PM, display shows 12
      expect(emitted![0][0]).toEqual({ hours: 12, minutes: 0 });
    });
  });

  describe('keyboard navigation', () => {
    it('increments hours with ArrowUp', async () => {
      const wrapper = mount(CoarTimePicker, {
        props: { modelValue: { hours: 9, minutes: 0 }, use24Hour: true },
      });
      const hoursSpinner = findSpinbutton(wrapper, 'Hours');
      await hoursSpinner.trigger('keydown', { key: 'ArrowUp' });
      const emitted = wrapper.emitted('update:modelValue');
      expect(emitted![0][0]).toEqual({ hours: 10, minutes: 0 });
    });

    it('decrements minutes with ArrowDown', async () => {
      const wrapper = mount(CoarTimePicker, {
        props: {
          modelValue: { hours: 9, minutes: 30 },
          use24Hour: true,
          minuteStep: 5,
        },
      });
      const minutesSpinner = findSpinbutton(wrapper, 'Minutes');
      await minutesSpinner.trigger('keydown', { key: 'ArrowDown' });
      const emitted = wrapper.emitted('update:modelValue');
      expect(emitted![0][0]).toEqual({ hours: 9, minutes: 25 });
    });

    it('toggles period with ArrowUp on AM/PM spinner', async () => {
      const wrapper = mount(CoarTimePicker, {
        props: { modelValue: { hours: 9, minutes: 0 }, use24Hour: false },
      });
      const periodSpinner = findSpinbutton(wrapper, 'AM/PM');
      await periodSpinner.trigger('keydown', { key: 'ArrowUp' });
      const emitted = wrapper.emitted('update:modelValue');
      expect(emitted![0][0]).toEqual({ hours: 21, minutes: 0 });
    });
  });

  describe('min/max constraints', () => {
    it('disables increment hours when at max', () => {
      const wrapper = mount(CoarTimePicker, {
        props: {
          modelValue: { hours: 16, minutes: 0 },
          use24Hour: true,
          maxTime: { hours: 17, minutes: 0 },
        },
      });
      // Next hour (17) with minutes (0) = 17:00, max is 17:00 → NOT disabled
      // Next hour (17) with minutes (0) = 17:00 <= 17:00 → allowed
      const increaseBtn = findBtn(wrapper, 'Increase hours');
      expect(increaseBtn.attributes('disabled')).toBeUndefined();
    });

    it('disables increment hours when exceeds max', () => {
      const wrapper = mount(CoarTimePicker, {
        props: {
          modelValue: { hours: 17, minutes: 0 },
          use24Hour: true,
          maxTime: { hours: 17, minutes: 0 },
        },
      });
      // Next hour (18) > max (17:00) → disabled
      const increaseBtn = findBtn(wrapper, 'Increase hours');
      expect(increaseBtn.attributes('disabled')).toBeDefined();
    });

    it('disables AM when minTime is in PM', () => {
      const wrapper = mount(CoarTimePicker, {
        props: {
          modelValue: { hours: 14, minutes: 0 },
          use24Hour: false,
          minTime: { hours: 12, minutes: 0 },
        },
      });
      // AM toggle buttons should be disabled (period is PM, toggling to AM would violate min)
      const toggleBtns = wrapper.findAll('button[aria-label="Toggle AM/PM"]');
      expect(toggleBtns[0].attributes('disabled')).toBeDefined();
    });
  });

  describe('disabled and readonly states', () => {
    it('does not emit when disabled', async () => {
      const wrapper = mount(CoarTimePicker, {
        props: {
          modelValue: { hours: 9, minutes: 0 },
          use24Hour: true,
          disabled: true,
        },
      });
      await findBtn(wrapper, 'Increase hours').trigger('click');
      expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    });

    it('does not emit when readonly', async () => {
      const wrapper = mount(CoarTimePicker, {
        props: {
          modelValue: { hours: 9, minutes: 0 },
          use24Hour: true,
          readonly: true,
        },
      });
      await findBtn(wrapper, 'Increase hours').trigger('click');
      expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    });

    it('hides buttons in readonly mode', () => {
      const wrapper = mount(CoarTimePicker, {
        props: { use24Hour: true, readonly: true },
      });
      expect(wrapper.find('.coar-time-picker--readonly').exists()).toBe(true);
    });

    it('applies disabled class', () => {
      const wrapper = mount(CoarTimePicker, {
        props: { use24Hour: true, disabled: true },
      });
      expect(wrapper.find('.coar-time-picker--disabled').exists()).toBe(true);
    });
  });

  describe('size variants', () => {
    it.each(['xs', 's', 'm', 'l'] as const)('renders size %s', (size) => {
      const wrapper = mount(CoarTimePicker, {
        props: { size, use24Hour: true },
      });
      expect(
        wrapper.find(`.coar-time-picker--${size}`).exists(),
      ).toBe(true);
    });
  });

  describe('v-model sync', () => {
    it('updates display when modelValue changes externally', async () => {
      const wrapper = mount(CoarTimePicker, {
        props: { modelValue: { hours: 9, minutes: 0 }, use24Hour: true },
      });
      let values = getDisplayValues(wrapper);
      expect(values[0]).toBe('09');

      await wrapper.setProps({ modelValue: { hours: 15, minutes: 45 } });
      await nextTick();
      values = getDisplayValues(wrapper);
      expect(values[0]).toBe('15');
      expect(values[1]).toBe('45');
    });
  });

  describe('accessibility', () => {
    it('has role group with aria-label', () => {
      const wrapper = mount(CoarTimePicker, {
        props: { use24Hour: true, ariaLabel: 'Meeting time' },
      });
      const group = wrapper.find('[role="group"]');
      expect(group.attributes('aria-label')).toBe('Meeting time');
    });

    it('has spinbutton roles on value displays', () => {
      const wrapper = mount(CoarTimePicker, {
        props: { use24Hour: true },
      });
      const spinbuttons = wrapper.findAll('[role="spinbutton"]');
      expect(spinbuttons.length).toBe(2); // hours + minutes
    });

    it('has three spinbuttons in 12h mode', () => {
      const wrapper = mount(CoarTimePicker, {
        props: { use24Hour: false },
      });
      const spinbuttons = wrapper.findAll('[role="spinbutton"]');
      expect(spinbuttons.length).toBe(3); // hours + minutes + period
    });
  });
});
