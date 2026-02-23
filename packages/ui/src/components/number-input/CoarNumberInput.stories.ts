import type { Meta, StoryObj } from '@storybook/vue3';
import { CoarNumberInput } from '@cocoar/vue-ui';

const meta: Meta<typeof CoarNumberInput> = {
  title: 'Form Controls/Number Input',
  component: CoarNumberInput,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['xs', 's', 'm', 'l'] },
    stepperButtons: { control: 'select', options: ['none', 'increment', 'decrement', 'both'] },
  },
};
export default meta;
type Story = StoryObj<typeof CoarNumberInput>;

export const Playground: Story = {
  args: {
    label: 'Amount',
    placeholder: '0',
    size: 'm',
    step: 1,
    decimals: 0,
    clearable: true,
    stepperButtons: 'both',
  },
};

export const Sizes: Story = {
  render: () => ({
    components: { CoarNumberInput },
    template: `
      <div style="display: flex; flex-direction: column; gap: 16px; max-width: 300px;">
        <CoarNumberInput label="Extra Small" size="xs" :modelValue="42" stepperButtons="both" />
        <CoarNumberInput label="Small" size="s" :modelValue="42" stepperButtons="both" />
        <CoarNumberInput label="Medium (default)" size="m" :modelValue="42" stepperButtons="both" />
        <CoarNumberInput label="Large" size="l" :modelValue="42" stepperButtons="both" />
      </div>
    `,
  }),
};

export const StepperVariants: Story = {
  render: () => ({
    components: { CoarNumberInput },
    template: `
      <div style="display: flex; flex-direction: column; gap: 16px; max-width: 300px;">
        <CoarNumberInput label="No Buttons" :modelValue="10" stepperButtons="none" />
        <CoarNumberInput label="Both Buttons" :modelValue="10" stepperButtons="both" />
        <CoarNumberInput label="Increment Only" :modelValue="10" stepperButtons="increment" />
        <CoarNumberInput label="Decrement Only" :modelValue="10" stepperButtons="decrement" />
      </div>
    `,
  }),
};

export const MinMaxDecimals: Story = {
  render: () => ({
    components: { CoarNumberInput },
    template: `
      <div style="display: flex; flex-direction: column; gap: 16px; max-width: 300px;">
        <CoarNumberInput label="Min 0, Max 100" :modelValue="50" :min="0" :max="100" stepperButtons="both" hint="Range: 0–100" />
        <CoarNumberInput label="Step 0.5" :modelValue="1.5" :step="0.5" :decimals="1" stepperButtons="both" />
        <CoarNumberInput label="2 Decimal Places" :modelValue="3.14" :decimals="2" :step="0.01" stepperButtons="both" />
      </div>
    `,
  }),
};

export const PrefixSuffix: Story = {
  render: () => ({
    components: { CoarNumberInput },
    template: `
      <div style="display: flex; flex-direction: column; gap: 16px; max-width: 300px;">
        <CoarNumberInput label="Price" prefix="$" :modelValue="99" :decimals="2" />
        <CoarNumberInput label="Weight" suffix="kg" :modelValue="75" :decimals="1" />
        <CoarNumberInput label="Percentage" suffix="%" :modelValue="50" :min="0" :max="100" stepperButtons="both" />
      </div>
    `,
  }),
};

export const States: Story = {
  render: () => ({
    components: { CoarNumberInput },
    template: `
      <div style="display: flex; flex-direction: column; gap: 16px; max-width: 300px;">
        <CoarNumberInput label="Default" placeholder="0" />
        <CoarNumberInput label="With Hint" :modelValue="42" hint="Drag label to adjust" />
        <CoarNumberInput label="With Error" :modelValue="-5" error="Must be positive" />
        <CoarNumberInput label="Required" placeholder="0" required />
        <CoarNumberInput label="Disabled" :modelValue="100" disabled stepperButtons="both" />
        <CoarNumberInput label="Read Only" :modelValue="42" readonly />
      </div>
    `,
  }),
};
