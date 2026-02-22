import type { Meta, StoryObj } from '@storybook/vue3';
import { CoarProgressBar } from '@cocoar/vue-ui';

const meta: Meta<typeof CoarProgressBar> = {
  title: 'Components/ProgressBar',
  component: CoarProgressBar,
  tags: ['autodocs'],
  argTypes: {
    value: { control: { type: 'range', min: 0, max: 100 } },
    max: { control: 'number' },
    variant: {
      control: 'select',
      options: ['accent', 'success', 'warning', 'error'],
    },
    size: {
      control: 'select',
      options: ['s', 'm', 'l'],
    },
    indeterminate: { control: 'boolean' },
    label: { control: 'text' },
    showValue: { control: 'boolean' },
  },
};
export default meta;
type Story = StoryObj<typeof CoarProgressBar>;

export const Playground: Story = {
  args: {
    value: 60,
    max: 100,
    variant: 'accent',
    size: 'm',
    showValue: true,
  },
};

export const Variants: Story = {
  render: () => ({
    components: { CoarProgressBar },
    template: `
      <div style="display: flex; flex-direction: column; gap: 16px; max-width: 400px;">
        <CoarProgressBar :value="65" variant="accent" showValue />
        <CoarProgressBar :value="80" variant="success" showValue />
        <CoarProgressBar :value="45" variant="warning" showValue />
        <CoarProgressBar :value="30" variant="error" showValue />
      </div>
    `,
  }),
};

export const Sizes: Story = {
  render: () => ({
    components: { CoarProgressBar },
    template: `
      <div style="display: flex; flex-direction: column; gap: 24px; max-width: 400px;">
        <div>
          <p class="coar-caption" style="margin-bottom: 8px;">Small (2px)</p>
          <CoarProgressBar :value="60" size="s" />
        </div>
        <div>
          <p class="coar-caption" style="margin-bottom: 8px;">Medium (4px) — default</p>
          <CoarProgressBar :value="60" size="m" />
        </div>
        <div>
          <p class="coar-caption" style="margin-bottom: 8px;">Large (8px)</p>
          <CoarProgressBar :value="60" size="l" />
        </div>
      </div>
    `,
  }),
};

export const Indeterminate: Story = {
  render: () => ({
    components: { CoarProgressBar },
    template: `
      <div style="display: flex; flex-direction: column; gap: 16px; max-width: 400px;">
        <CoarProgressBar indeterminate variant="accent" />
        <CoarProgressBar indeterminate variant="success" size="l" />
      </div>
    `,
  }),
};

export const WithValue: Story = {
  render: () => ({
    components: { CoarProgressBar },
    template: `
      <div style="display: flex; flex-direction: column; gap: 16px; max-width: 400px;">
        <CoarProgressBar :value="0" showValue />
        <CoarProgressBar :value="25" showValue />
        <CoarProgressBar :value="50" showValue />
        <CoarProgressBar :value="75" showValue />
        <CoarProgressBar :value="100" showValue variant="success" />
      </div>
    `,
  }),
};
