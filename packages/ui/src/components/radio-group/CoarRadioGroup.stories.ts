import type { Meta, StoryObj } from '@storybook/vue3';
import { CoarRadioGroup, CoarRadioButton } from '@cocoar/vue-ui';
import { ref } from 'vue';

const meta: Meta<typeof CoarRadioGroup> = {
  title: 'Form Controls/RadioGroup',
  component: CoarRadioGroup,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['s', 'm', 'l'] },
    orientation: { control: 'select', options: ['vertical', 'horizontal'] },
  },
};
export default meta;
type Story = StoryObj<typeof CoarRadioGroup>;

export const Playground: Story = {
  render: (args) => ({
    components: { CoarRadioGroup, CoarRadioButton },
    setup() {
      const selected = ref('b');
      return { args, selected };
    },
    template: `
      <CoarRadioGroup v-bind="args" v-model="selected">
        <CoarRadioButton value="a">Option A</CoarRadioButton>
        <CoarRadioButton value="b">Option B</CoarRadioButton>
        <CoarRadioButton value="c">Option C</CoarRadioButton>
      </CoarRadioGroup>
      <p style="margin-top: 8px; font-size: 14px; color: #666;">Selected: {{ selected }}</p>
    `,
  }),
  args: {
    name: 'playground',
    label: 'Choose an option',
    size: 'm',
    orientation: 'vertical',
  },
};

export const Horizontal: Story = {
  render: () => ({
    components: { CoarRadioGroup, CoarRadioButton },
    setup() {
      const selected = ref('banana');
      return { selected };
    },
    template: `
      <CoarRadioGroup name="fruits" orientation="horizontal" v-model="selected">
        <CoarRadioButton value="apple">Apple</CoarRadioButton>
        <CoarRadioButton value="banana">Banana</CoarRadioButton>
        <CoarRadioButton value="cherry">Cherry</CoarRadioButton>
      </CoarRadioGroup>
    `,
  }),
};

export const Sizes: Story = {
  render: () => ({
    components: { CoarRadioGroup, CoarRadioButton },
    template: `
      <div style="display: flex; flex-direction: column; gap: 24px;">
        <CoarRadioGroup name="small" size="s" label="Small" modelValue="a">
          <CoarRadioButton value="a">Option A</CoarRadioButton>
          <CoarRadioButton value="b">Option B</CoarRadioButton>
        </CoarRadioGroup>

        <CoarRadioGroup name="medium" size="m" label="Medium" modelValue="a">
          <CoarRadioButton value="a">Option A</CoarRadioButton>
          <CoarRadioButton value="b">Option B</CoarRadioButton>
        </CoarRadioGroup>

        <CoarRadioGroup name="large" size="l" label="Large" modelValue="a">
          <CoarRadioButton value="a">Option A</CoarRadioButton>
          <CoarRadioButton value="b">Option B</CoarRadioButton>
        </CoarRadioGroup>
      </div>
    `,
  }),
};

export const States: Story = {
  render: () => ({
    components: { CoarRadioGroup, CoarRadioButton },
    template: `
      <div style="display: flex; flex-direction: column; gap: 24px;">
        <CoarRadioGroup name="disabled" disabled label="Disabled" modelValue="a">
          <CoarRadioButton value="a">Disabled A</CoarRadioButton>
          <CoarRadioButton value="b">Disabled B</CoarRadioButton>
        </CoarRadioGroup>

        <CoarRadioGroup name="partial" label="Partially disabled" modelValue="a">
          <CoarRadioButton value="a">Enabled</CoarRadioButton>
          <CoarRadioButton value="b" disabled>Disabled</CoarRadioButton>
        </CoarRadioGroup>

        <CoarRadioGroup name="error" error="Please select an option" label="With error">
          <CoarRadioButton value="a">Option A</CoarRadioButton>
          <CoarRadioButton value="b">Option B</CoarRadioButton>
        </CoarRadioGroup>

        <CoarRadioGroup name="hint" hint="Choose your preferred option" label="With hint" modelValue="b">
          <CoarRadioButton value="a">Option A</CoarRadioButton>
          <CoarRadioButton value="b">Option B</CoarRadioButton>
        </CoarRadioGroup>
      </div>
    `,
  }),
};
