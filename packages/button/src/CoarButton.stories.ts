import type { Meta, StoryObj } from '@storybook/vue3';
import CoarButton from './CoarButton.vue';

const meta: Meta<typeof CoarButton> = {
  title: 'Components/CoarButton',
  component: CoarButton,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline'],
    },
    size: {
      control: { type: 'range', min: 1, max: 5, step: 1 },
    },
    disabled: { control: 'boolean' },
    label: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof CoarButton>;

export const Primary: Story = {
  args: {
    label: 'Primary Button',
    variant: 'primary',
    size: 3,
  },
};

export const Secondary: Story = {
  args: {
    label: 'Secondary Button',
    variant: 'secondary',
    size: 3,
  },
};

export const Outline: Story = {
  args: {
    label: 'Outline Button',
    variant: 'outline',
    size: 3,
  },
};

export const Disabled: Story = {
  args: {
    label: 'Disabled Button',
    variant: 'primary',
    disabled: true,
  },
};

export const AllSizes: Story = {
  render: () => ({
    components: { CoarButton },
    template: `
      <div style="display: flex; gap: 8px; align-items: center;">
        <CoarButton label="Size 1" :size="1" />
        <CoarButton label="Size 2" :size="2" />
        <CoarButton label="Size 3" :size="3" />
        <CoarButton label="Size 4" :size="4" />
        <CoarButton label="Size 5" :size="5" />
      </div>
    `,
  }),
};
