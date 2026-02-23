import type { Meta, StoryObj } from '@storybook/vue3';
import { CoarPasswordInput } from '@cocoar/vue-ui';

const meta: Meta<typeof CoarPasswordInput> = {
  title: 'Form Controls/Password Input',
  component: CoarPasswordInput,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['xs', 's', 'm', 'l'] },
  },
};
export default meta;
type Story = StoryObj<typeof CoarPasswordInput>;

export const Playground: Story = {
  args: {
    label: 'Password',
    placeholder: 'Enter your password',
    size: 'm',
    clearable: true,
  },
};

export const Sizes: Story = {
  render: () => ({
    components: { CoarPasswordInput },
    template: `
      <div style="display: flex; flex-direction: column; gap: 16px; max-width: 400px;">
        <CoarPasswordInput label="Extra Small" size="xs" placeholder="Password" />
        <CoarPasswordInput label="Small" size="s" placeholder="Password" />
        <CoarPasswordInput label="Medium (default)" size="m" placeholder="Password" />
        <CoarPasswordInput label="Large" size="l" placeholder="Password" />
      </div>
    `,
  }),
};

export const States: Story = {
  render: () => ({
    components: { CoarPasswordInput },
    template: `
      <div style="display: flex; flex-direction: column; gap: 16px; max-width: 400px;">
        <CoarPasswordInput label="Default" placeholder="Enter password..." />
        <CoarPasswordInput label="With Hint" placeholder="Enter password..." hint="Minimum 8 characters" />
        <CoarPasswordInput label="With Error" modelValue="short" error="Password too short" />
        <CoarPasswordInput label="Required" placeholder="Required" required />
        <CoarPasswordInput label="Disabled" modelValue="disabled" disabled />
        <CoarPasswordInput label="Read Only" modelValue="readonly-pw" readonly />
      </div>
    `,
  }),
};
