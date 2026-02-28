import type { Meta, StoryObj } from '@storybook/vue3';
import { CoarSpinner } from '@cocoar/vue-ui';

const meta: Meta<typeof CoarSpinner> = {
  title: 'General/Spinner',
  component: CoarSpinner,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['xs', 's', 'm', 'l'],
    },
    label: { control: 'text' },
  },
};
export default meta;
type Story = StoryObj<typeof CoarSpinner>;

export const Playground: Story = {
  args: {
    size: 'm',
    label: 'Loading',
  },
};

export const Sizes: Story = {
  render: () => ({
    components: { CoarSpinner },
    template: `
      <div style="display: flex; align-items: center; gap: 24px;">
        <div style="text-align: center;">
          <CoarSpinner size="xs" />
          <p class="coar-caption" style="margin-top: 8px;">XS (16px)</p>
        </div>
        <div style="text-align: center;">
          <CoarSpinner size="s" />
          <p class="coar-caption" style="margin-top: 8px;">S (20px)</p>
        </div>
        <div style="text-align: center;">
          <CoarSpinner size="m" />
          <p class="coar-caption" style="margin-top: 8px;">M (24px)</p>
        </div>
        <div style="text-align: center;">
          <CoarSpinner size="l" />
          <p class="coar-caption" style="margin-top: 8px;">L (32px)</p>
        </div>
      </div>
    `,
  }),
};
