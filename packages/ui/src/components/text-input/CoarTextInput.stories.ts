import type { Meta, StoryObj } from '@storybook/vue3';
import { CoarTextInput } from '@cocoar/vue-ui';

const meta: Meta<typeof CoarTextInput> = {
  title: 'Form Controls/Text Input',
  component: CoarTextInput,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['xs', 's', 'm', 'l'] },
  },
};
export default meta;
type Story = StoryObj<typeof CoarTextInput>;

export const Playground: Story = {
  args: {
    label: 'Username',
    placeholder: 'Enter your username',
    size: 'm',
    clearable: true,
  },
};

export const Sizes: Story = {
  render: () => ({
    components: { CoarTextInput },
    template: `
      <div style="display: flex; flex-direction: column; gap: 16px; max-width: 400px;">
        <CoarTextInput label="Extra Small" size="xs" placeholder="XS input" />
        <CoarTextInput label="Small" size="s" placeholder="Small input" />
        <CoarTextInput label="Medium (default)" size="m" placeholder="Medium input" />
        <CoarTextInput label="Large" size="l" placeholder="Large input" />
      </div>
    `,
  }),
};

export const States: Story = {
  render: () => ({
    components: { CoarTextInput },
    template: `
      <div style="display: flex; flex-direction: column; gap: 16px; max-width: 400px;">
        <CoarTextInput label="Default" placeholder="Enter text..." />
        <CoarTextInput label="With Hint" placeholder="Enter email..." hint="We'll never share your email" />
        <CoarTextInput label="With Error" modelValue="bad@" error="Invalid email address" />
        <CoarTextInput label="Required" placeholder="Required field" required />
        <CoarTextInput label="Disabled" modelValue="Can't edit" disabled />
        <CoarTextInput label="Read Only" modelValue="Read only value" readonly />
      </div>
    `,
  }),
};

export const PrefixSuffix: Story = {
  render: () => ({
    components: { CoarTextInput },
    template: `
      <div style="display: flex; flex-direction: column; gap: 16px; max-width: 400px;">
        <CoarTextInput label="With Prefix" prefix="$" placeholder="0.00" />
        <CoarTextInput label="With Suffix" suffix="kg" placeholder="Weight" />
        <CoarTextInput label="Both" prefix="https://" suffix=".com" placeholder="domain" />
      </div>
    `,
  }),
};

export const Multiline: Story = {
  render: () => ({
    components: { CoarTextInput },
    template: `
      <div style="display: flex; flex-direction: column; gap: 16px; max-width: 400px;">
        <CoarTextInput label="Description" :rows="4" placeholder="Enter a description..." />
        <CoarTextInput label="With Error" :rows="3" modelValue="Short" error="Minimum 50 characters required" />
      </div>
    `,
  }),
};
