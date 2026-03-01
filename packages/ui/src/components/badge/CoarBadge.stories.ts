import { CoarBadge } from '@cocoar/vue-ui';
import type { Meta, StoryObj } from '@storybook/vue3';

const meta: Meta<typeof CoarBadge> = {
  title: 'General/Badge',
  component: CoarBadge,
  tags: ['autodocs'],
  argTypes: {
    content: { control: 'text' },
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'success', 'warning', 'error', 'info'],
    },
    size: { control: 'select', options: ['xs', 's', 'm', 'l', 'xl'] },
    pulse: { control: 'boolean' },
    dot: { control: 'boolean' },
    max: { control: 'number' },
    bordered: { control: 'boolean' },
  },
};
export default meta;
type Story = StoryObj<typeof CoarBadge>;

export const Playground: Story = {
  args: {
    content: '5',
    variant: 'primary',
    size: 'm',
  },
};

export const Variants: Story = {
  render: () => ({
    components: { CoarBadge },
    template: `
      <div style="display: flex; align-items: center; gap: 16px;">
        <CoarBadge content="3" variant="primary" />
        <CoarBadge content="3" variant="secondary" />
        <CoarBadge content="3" variant="success" />
        <CoarBadge content="3" variant="warning" />
        <CoarBadge content="3" variant="error" />
        <CoarBadge content="3" variant="info" />
      </div>
    `,
  }),
};

export const Sizes: Story = {
  render: () => ({
    components: { CoarBadge },
    template: `
      <div style="display: flex; align-items: center; gap: 16px;">
        <div style="text-align: center;">
          <CoarBadge content="5" size="xs" />
          <p class="coar-caption" style="margin-top: 8px;">XS</p>
        </div>
        <div style="text-align: center;">
          <CoarBadge content="5" size="s" />
          <p class="coar-caption" style="margin-top: 8px;">S</p>
        </div>
        <div style="text-align: center;">
          <CoarBadge content="5" size="m" />
          <p class="coar-caption" style="margin-top: 8px;">M</p>
        </div>
        <div style="text-align: center;">
          <CoarBadge content="5" size="l" />
          <p class="coar-caption" style="margin-top: 8px;">L</p>
        </div>
        <div style="text-align: center;">
          <CoarBadge content="5" size="xl" />
          <p class="coar-caption" style="margin-top: 8px;">XL</p>
        </div>
      </div>
    `,
  }),
};

export const DotMode: Story = {
  render: () => ({
    components: { CoarBadge },
    template: `
      <div style="display: flex; align-items: center; gap: 16px;">
        <CoarBadge dot variant="primary" size="s" />
        <CoarBadge dot variant="success" size="m" />
        <CoarBadge dot variant="error" size="l" />
      </div>
    `,
  }),
};

export const MaxValue: Story = {
  render: () => ({
    components: { CoarBadge },
    template: `
      <div style="display: flex; align-items: center; gap: 16px;">
        <CoarBadge :content="5" :max="99" />
        <CoarBadge :content="99" :max="99" />
        <CoarBadge :content="150" :max="99" />
      </div>
    `,
  }),
};

export const Bordered: Story = {
  render: () => ({
    components: { CoarBadge },
    template: `
      <div style="display: flex; align-items: center; gap: 16px; padding: 8px; background: var(--coar-background-neutral-secondary); border-radius: 8px;">
        <CoarBadge content="3" variant="primary" bordered />
        <CoarBadge content="3" variant="error" bordered />
        <CoarBadge dot variant="success" bordered />
      </div>
    `,
  }),
};

export const Pulse: Story = {
  render: () => ({
    components: { CoarBadge },
    template: `
      <div style="display: flex; align-items: center; gap: 16px;">
        <CoarBadge content="!" variant="error" pulse />
        <CoarBadge dot variant="success" pulse />
      </div>
    `,
  }),
};
