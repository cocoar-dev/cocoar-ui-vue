import type { Meta, StoryObj } from '@storybook/vue3';
import { CoarDivider } from '@cocoar/vue-ui';

const meta: Meta<typeof CoarDivider> = {
  title: 'Components/Divider',
  component: CoarDivider,
  tags: ['autodocs'],
  argTypes: {
    align: {
      control: 'select',
      options: ['left', 'center', 'right'],
    },
    variant: {
      control: 'select',
      options: ['subtle', 'strong'],
    },
    width: { control: { type: 'range', min: 10, max: 100 } },
    spacingTop: { control: 'number' },
    spacingBottom: { control: 'number' },
  },
};
export default meta;
type Story = StoryObj<typeof CoarDivider>;

export const Playground: Story = {
  args: {
    align: 'center',
    variant: 'subtle',
    width: 90,
    spacingTop: 0,
    spacingBottom: 0,
  },
};

export const WithText: Story = {
  args: { align: 'center', variant: 'subtle', width: 90 },
  render: (args) => ({
    components: { CoarDivider },
    setup() { return { args }; },
    template: '<CoarDivider v-bind="args">OR</CoarDivider>',
  }),
};

export const Alignments: Story = {
  render: () => ({
    components: { CoarDivider },
    template: `
      <div style="display: flex; flex-direction: column; gap: 24px;">
        <div>
          <p class="coar-body-small" style="margin-bottom: 8px;">Left aligned</p>
          <CoarDivider align="left">Section</CoarDivider>
        </div>
        <div>
          <p class="coar-body-small" style="margin-bottom: 8px;">Center aligned (default)</p>
          <CoarDivider align="center">Section</CoarDivider>
        </div>
        <div>
          <p class="coar-body-small" style="margin-bottom: 8px;">Right aligned</p>
          <CoarDivider align="right">Section</CoarDivider>
        </div>
      </div>
    `,
  }),
};

export const Variants: Story = {
  render: () => ({
    components: { CoarDivider },
    template: `
      <div style="display: flex; flex-direction: column; gap: 24px;">
        <div>
          <p class="coar-body-small" style="margin-bottom: 8px;">Subtle (default)</p>
          <CoarDivider variant="subtle" />
        </div>
        <div>
          <p class="coar-body-small" style="margin-bottom: 8px;">Strong</p>
          <CoarDivider variant="strong" />
        </div>
      </div>
    `,
  }),
};
