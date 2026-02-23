import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import CoarRadioGroup from './CoarRadioGroup.vue';
import CoarRadioButton from './CoarRadioButton.vue';

const RadioGroupWithOptions = {
  components: { CoarRadioGroup, CoarRadioButton },
  template: `
    <CoarRadioGroup v-bind="groupProps" v-model="selected">
      <CoarRadioButton value="a">Option A</CoarRadioButton>
      <CoarRadioButton value="b">Option B</CoarRadioButton>
      <CoarRadioButton value="c" :disabled="disableC">Option C</CoarRadioButton>
    </CoarRadioGroup>
  `,
  props: {
    groupProps: { type: Object, default: () => ({ name: 'test' }) },
    disableC: { type: Boolean, default: false },
    initialValue: { default: undefined },
  },
  data() {
    return { selected: (this as unknown as { initialValue: unknown }).initialValue };
  },
};

function mountGroup(groupProps = {}, opts = {}) {
  return mount(RadioGroupWithOptions, {
    props: { groupProps: { name: 'test', ...groupProps }, ...opts },
  });
}

describe('CoarRadioGroup', () => {
  it('renders with default props', () => {
    const wrapper = mountGroup();
    expect(wrapper.find('[role="radiogroup"]').exists()).toBe(true);
  });

  it('renders radio buttons', () => {
    const wrapper = mountGroup();
    expect(wrapper.findAll('input[type="radio"]')).toHaveLength(3);
  });

  it('applies vertical orientation by default', () => {
    const wrapper = mountGroup();
    expect(wrapper.find('.coar-radio-group--vertical').exists()).toBe(true);
  });

  it('applies horizontal orientation', () => {
    const wrapper = mountGroup({ orientation: 'horizontal' });
    expect(wrapper.find('.coar-radio-group--horizontal').exists()).toBe(true);
  });

  it('all radio inputs share the same name', () => {
    const wrapper = mountGroup({ name: 'colors' });
    const inputs = wrapper.findAll('input[type="radio"]');
    inputs.forEach(input => {
      expect(input.attributes('name')).toBe('colors');
    });
  });

  it('selects value on radio click', async () => {
    const wrapper = mountGroup();
    const radios = wrapper.findAll('.coar-radio');
    await radios[1].trigger('click');
    expect(wrapper.vm.selected).toBe('b');
  });

  it('updates checked state visually', async () => {
    const wrapper = mountGroup();
    const radios = wrapper.findAll('.coar-radio');
    await radios[0].trigger('click');
    expect(radios[0].classes()).toContain('coar-radio--checked');
    expect(radios[1].classes()).not.toContain('coar-radio--checked');
  });

  it('applies disabled state to group', () => {
    const wrapper = mountGroup({ disabled: true });
    expect(wrapper.find('.coar-radio-group--disabled').exists()).toBe(true);
  });

  it('applies error state', () => {
    const wrapper = mountGroup({ error: 'Required!' });
    expect(wrapper.find('.coar-radio-group--error').exists()).toBe(true);
    expect(wrapper.find('.coar-form-field-message--error').text()).toBe('Required!');
  });

  it('shows hint when no error', () => {
    const wrapper = mountGroup({ hint: 'Pick one' });
    const msg = wrapper.find('.coar-form-field-message');
    expect(msg.text()).toBe('Pick one');
    expect(msg.classes()).not.toContain('coar-form-field-message--error');
  });

  it('error takes priority over hint', () => {
    const wrapper = mountGroup({ error: 'Error', hint: 'Hint' });
    expect(wrapper.find('.coar-form-field-message').text()).toBe('Error');
  });

  it('applies size classes to radios', () => {
    const wrapper = mountGroup({ size: 'l' });
    const radios = wrapper.findAll('.coar-radio');
    radios.forEach(r => expect(r.classes()).toContain('coar-radio--l'));
  });

  it('applies size s to radios', () => {
    const wrapper = mountGroup({ size: 's' });
    const radios = wrapper.findAll('.coar-radio');
    radios.forEach(r => expect(r.classes()).toContain('coar-radio--s'));
  });

  it('propagates error state to radio buttons', () => {
    const wrapper = mountGroup({ error: 'Bad' });
    const radios = wrapper.findAll('.coar-radio');
    radios.forEach(r => expect(r.classes()).toContain('coar-radio--error'));
  });

  it('sets aria-label on radiogroup', () => {
    const wrapper = mountGroup({ label: 'My Group' });
    expect(wrapper.find('[role="radiogroup"]').attributes('aria-label')).toBe('My Group');
  });

  it('sets aria-required when required', () => {
    const wrapper = mountGroup({ required: true });
    expect(wrapper.find('[role="radiogroup"]').attributes('aria-required')).toBe('true');
  });
});

describe('CoarRadioButton', () => {
  it('disables individual radio', () => {
    const wrapper = mount(RadioGroupWithOptions, {
      props: { groupProps: { name: 'test' }, disableC: true },
    });
    const radios = wrapper.findAll('.coar-radio');
    expect(radios[2].classes()).toContain('coar-radio--disabled');
    expect((radios[2].find('input').element as HTMLInputElement).disabled).toBe(true);
  });

  it('does not select disabled radio on click', async () => {
    const wrapper = mount(RadioGroupWithOptions, {
      props: { groupProps: { name: 'test' }, disableC: true },
    });
    const radios = wrapper.findAll('.coar-radio');
    await radios[2].trigger('click');
    expect(wrapper.vm.selected).toBeUndefined();
  });

  it('renders slot content as label', () => {
    const wrapper = mountGroup();
    const texts = wrapper.findAll('.coar-radio__text');
    expect(texts[0].text()).toBe('Option A');
    expect(texts[1].text()).toBe('Option B');
  });
});
