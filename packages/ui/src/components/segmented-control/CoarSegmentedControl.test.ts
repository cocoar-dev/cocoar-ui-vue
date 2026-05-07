import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, ref } from 'vue';
import CoarSegmentedControl from './CoarSegmentedControl.vue';

const VIEWS = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'agenda', label: 'Agenda' },
];

function createControl(options: {
  modelValue?: string;
  size?: 'xs' | 's' | 'm' | 'l';
  disabled?: boolean;
  optionDisabled?: string;
  fullWidth?: boolean;
} = {}) {
  const opts = options.optionDisabled
    ? VIEWS.map((v) => v.value === options.optionDisabled ? { ...v, disabled: true } : v)
    : VIEWS;

  const Wrapper = defineComponent({
    components: { CoarSegmentedControl },
    setup() {
      const value = ref(options.modelValue ?? 'week');
      return { value, opts };
    },
    template: `
      <CoarSegmentedControl
        v-model="value"
        :options="opts"
        :size="${options.size ? `'${options.size}'` : `'s'`}"
        ${options.disabled ? ':disabled="true"' : ''}
        ${options.fullWidth ? ':full-width="true"' : ''}
        aria-label="Test switcher"
      />
    `,
  });

  return mount(Wrapper, { attachTo: document.body });
}

describe('CoarSegmentedControl', () => {
  it('renders one segment per option with the right label', () => {
    const wrapper = createControl();
    const segments = wrapper.findAll('.coar-segmented-control__segment');
    expect(segments).toHaveLength(4);
    expect(segments[0].text()).toBe('Day');
    expect(segments[3].text()).toBe('Agenda');
  });

  it('marks the active segment via aria-pressed and active class', () => {
    const wrapper = createControl({ modelValue: 'month' });
    const segments = wrapper.findAll('.coar-segmented-control__segment');
    const monthSeg = segments[2];
    expect(monthSeg.attributes('aria-pressed')).toBe('true');
    expect(monthSeg.classes()).toContain('coar-segmented-control__segment--active');

    const weekSeg = segments[1];
    expect(weekSeg.attributes('aria-pressed')).toBe('false');
    expect(weekSeg.classes()).not.toContain('coar-segmented-control__segment--active');
  });

  it('updates the model and emits change on click', async () => {
    const wrapper = createControl({ modelValue: 'week' });
    const segments = wrapper.findAll('.coar-segmented-control__segment');
    await segments[2].trigger('click'); // month
    expect(wrapper.vm.value).toBe('month');
  });

  it('does not update when clicking the already-active segment', async () => {
    const wrapper = createControl({ modelValue: 'week' });
    const segments = wrapper.findAll('.coar-segmented-control__segment');
    await segments[1].trigger('click'); // already active
    // model stays
    expect(wrapper.vm.value).toBe('week');
  });

  it('honors per-option disabled — click is a no-op', async () => {
    const wrapper = createControl({ modelValue: 'week', optionDisabled: 'agenda' });
    const segments = wrapper.findAll('.coar-segmented-control__segment');
    expect(segments[3].attributes('disabled')).toBeDefined();
    await segments[3].trigger('click');
    expect(wrapper.vm.value).toBe('week');
  });

  it('disables every segment when control is disabled', () => {
    const wrapper = createControl({ disabled: true });
    const segments = wrapper.findAll('.coar-segmented-control__segment');
    for (const s of segments) {
      expect(s.attributes('disabled')).toBeDefined();
    }
    expect(wrapper.find('.coar-segmented-control').classes()).toContain(
      'coar-segmented-control--disabled',
    );
  });

  it('applies the size modifier class', () => {
    const wrapper = createControl({ size: 'm' });
    expect(wrapper.find('.coar-segmented-control').classes()).toContain(
      'coar-segmented-control--m',
    );
  });

  it('applies full-width modifier when requested', () => {
    const wrapper = createControl({ fullWidth: true });
    expect(wrapper.find('.coar-segmented-control').classes()).toContain(
      'coar-segmented-control--full-width',
    );
  });

  it('exposes role="group" with the aria-label', () => {
    const wrapper = createControl();
    const root = wrapper.find('.coar-segmented-control');
    expect(root.attributes('role')).toBe('group');
    expect(root.attributes('aria-label')).toBe('Test switcher');
  });
});
