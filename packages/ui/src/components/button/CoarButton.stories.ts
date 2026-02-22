import type { Meta, StoryObj } from '@storybook/vue3';
import CoarButton from './CoarButton.vue';

const meta: Meta<typeof CoarButton> = {
  title: 'Components/CoarButton',
  component: CoarButton,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'tertiary', 'danger', 'ghost'],
    },
    size: {
      control: 'select',
      options: ['xs', 's', 'm', 'l'],
    },
    disabled: { control: 'boolean' },
    loading: { control: 'boolean' },
    fullWidth: { control: 'boolean' },
    type: {
      control: 'select',
      options: ['button', 'submit', 'reset'],
    },
  },
  args: {
    variant: 'primary',
    size: 'm',
    disabled: false,
    loading: false,
    fullWidth: false,
  },
};

export default meta;
type Story = StoryObj<typeof CoarButton>;

/** Interactive playground — use Controls to explore all props */
export const Playground: Story = {
  render: (args) => ({
    components: { CoarButton },
    setup: () => ({ args }),
    template: '<CoarButton v-bind="args">Button</CoarButton>',
  }),
};

/** All five visual variants side by side */
export const Variants: Story = {
  render: () => ({
    components: { CoarButton },
    template: `
      <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
        <CoarButton variant="primary">Primary</CoarButton>
        <CoarButton variant="secondary">Secondary</CoarButton>
        <CoarButton variant="tertiary">Tertiary</CoarButton>
        <CoarButton variant="danger">Danger</CoarButton>
        <CoarButton variant="ghost">Ghost</CoarButton>
      </div>
    `,
  }),
};

/** Size scale from xs to l */
export const Sizes: Story = {
  render: () => ({
    components: { CoarButton },
    template: `
      <div style="display: flex; gap: 12px; align-items: center;">
        <CoarButton size="xs">Extra Small</CoarButton>
        <CoarButton size="s">Small</CoarButton>
        <CoarButton size="m">Medium</CoarButton>
        <CoarButton size="l">Large</CoarButton>
      </div>
    `,
  }),
};

/** Disabled, loading, and full-width states */
export const States: Story = {
  render: () => ({
    components: { CoarButton },
    template: `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <div>
          <strong style="display: block; margin-bottom: 8px; font-family: Poppins, sans-serif; font-size: 13px; color: #6b6b6b;">Disabled</strong>
          <div style="display: flex; gap: 12px; align-items: center;">
            <CoarButton variant="primary" disabled>Primary</CoarButton>
            <CoarButton variant="secondary" disabled>Secondary</CoarButton>
            <CoarButton variant="tertiary" disabled>Tertiary</CoarButton>
            <CoarButton variant="danger" disabled>Danger</CoarButton>
            <CoarButton variant="ghost" disabled>Ghost</CoarButton>
          </div>
        </div>
        <div>
          <strong style="display: block; margin-bottom: 8px; font-family: Poppins, sans-serif; font-size: 13px; color: #6b6b6b;">Loading</strong>
          <div style="display: flex; gap: 12px; align-items: center;">
            <CoarButton variant="primary" loading>Primary</CoarButton>
            <CoarButton variant="secondary" loading>Secondary</CoarButton>
            <CoarButton variant="danger" loading>Danger</CoarButton>
          </div>
        </div>
        <div>
          <strong style="display: block; margin-bottom: 8px; font-family: Poppins, sans-serif; font-size: 13px; color: #6b6b6b;">Full Width</strong>
          <CoarButton fullWidth>Full Width Button</CoarButton>
        </div>
      </div>
    `,
  }),
};
