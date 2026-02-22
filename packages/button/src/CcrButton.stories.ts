import type { Meta, StoryObj } from '@storybook/vue3';
import CcrButton from './CcrButton.vue';

const meta: Meta<typeof CcrButton> = {
  title: 'Components/CcrButton',
  component: CcrButton,
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
type Story = StoryObj<typeof CcrButton>;

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
    components: { CcrButton },
    template: `
      <div style="display: flex; gap: 8px; align-items: center;">
        <CcrButton label="Size 1" :size="1" />
        <CcrButton label="Size 2" :size="2" />
        <CcrButton label="Size 3" :size="3" />
        <CcrButton label="Size 4" :size="4" />
        <CcrButton label="Size 5" :size="5" />
      </div>
    `,
  }),
};
