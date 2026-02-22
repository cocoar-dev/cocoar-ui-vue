import type { Meta, StoryObj } from '@storybook/vue3';
import CoarLabel from './CoarLabel.vue';

const meta: Meta<typeof CoarLabel> = {
  title: 'Components/CoarLabel',
  component: CoarLabel,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['xs', 's', 'm', 'l'],
    },
    required: { control: 'boolean' },
    for: { control: 'text' },
    text: { control: 'text' },
  },
  args: {
    size: 'm',
    required: false,
    text: 'Label Text',
  },
};

export default meta;
type Story = StoryObj<typeof CoarLabel>;

/** Interactive playground — use Controls to explore all props */
export const Playground: Story = {
  render: (args) => ({
    components: { CoarLabel },
    setup: () => ({ args }),
    template: '<CoarLabel v-bind="args" />',
  }),
};

/** Size scale from xs to l */
export const Sizes: Story = {
  render: () => ({
    components: { CoarLabel },
    template: `
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <CoarLabel size="xs">Extra Small Label</CoarLabel>
        <CoarLabel size="s">Small Label</CoarLabel>
        <CoarLabel size="m">Medium Label (default)</CoarLabel>
        <CoarLabel size="l">Large Label</CoarLabel>
      </div>
    `,
  }),
};

/** Required indicator and for attribute */
export const States: Story = {
  render: () => ({
    components: { CoarLabel },
    template: `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <div>
          <strong style="display: block; margin-bottom: 8px; font-family: Poppins, sans-serif; font-size: 13px; color: #6b6b6b;">Default</strong>
          <CoarLabel>Email Address</CoarLabel>
        </div>
        <div>
          <strong style="display: block; margin-bottom: 8px; font-family: Poppins, sans-serif; font-size: 13px; color: #6b6b6b;">Required</strong>
          <CoarLabel required>Email Address</CoarLabel>
        </div>
        <div>
          <strong style="display: block; margin-bottom: 8px; font-family: Poppins, sans-serif; font-size: 13px; color: #6b6b6b;">With for attribute</strong>
          <CoarLabel for="email-input" required>Email Address</CoarLabel>
          <input id="email-input" type="email" placeholder="your@email.com"
            style="margin-top: 4px; padding: 8px 12px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;" />
        </div>
      </div>
    `,
  }),
};
