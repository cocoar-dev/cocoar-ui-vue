import type { Meta, StoryObj } from '@storybook/vue3';
import { CoarCard } from '@cocoar/vue-ui';

const meta: Meta<typeof CoarCard> = {
  title: 'Data Display/Card',
  component: CoarCard,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['neutral', 'outlined', 'success', 'warning', 'error', 'info', 'accent'],
    },
    padding: {
      control: 'select',
      options: ['none', 's', 'm', 'l'],
    },
    elevated: { control: 'boolean' },
    borderless: { control: 'boolean' },
  },
};
export default meta;
type Story = StoryObj<typeof CoarCard>;

export const Playground: Story = {
  args: {
    variant: 'neutral',
    padding: 'm',
  },
  render: (args) => ({
    components: { CoarCard },
    setup() { return { args }; },
    template: `
      <CoarCard v-bind="args" style="max-width: 400px;">
        <template #header><h4 style="margin: 0;">Card Title</h4></template>
        <p style="margin: 0;">This is the card body content.</p>
        <template #footer>
          <div style="display: flex; justify-content: flex-end; gap: 8px;">
            <button>Cancel</button>
            <button>Save</button>
          </div>
        </template>
      </CoarCard>
    `,
  }),
};

export const Variants: Story = {
  render: () => ({
    components: { CoarCard },
    template: `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px;">
        <CoarCard variant="neutral"><div style="font-weight: 600;">Neutral</div><p style="margin: 4px 0 0;">Subtle gray background.</p></CoarCard>
        <CoarCard variant="outlined"><div style="font-weight: 600;">Outlined</div><p style="margin: 4px 0 0;">Clean white/surface background with border.</p></CoarCard>
        <CoarCard variant="success"><div style="font-weight: 600;">Success</div><p style="margin: 4px 0 0;">Operation completed successfully.</p></CoarCard>
        <CoarCard variant="warning"><div style="font-weight: 600;">Warning</div><p style="margin: 4px 0 0;">Please review before proceeding.</p></CoarCard>
        <CoarCard variant="error"><div style="font-weight: 600;">Error</div><p style="margin: 4px 0 0;">Something went wrong. Please try again.</p></CoarCard>
        <CoarCard variant="info"><div style="font-weight: 600;">Info</div><p style="margin: 4px 0 0;">Here's some helpful information.</p></CoarCard>
        <CoarCard variant="accent"><div style="font-weight: 600;">Accent</div><p style="margin: 4px 0 0;">Primary brand highlight.</p></CoarCard>
      </div>
    `,
  }),
};

export const PaddingSizes: Story = {
  render: () => ({
    components: { CoarCard },
    template: `
      <div style="display: flex; flex-direction: column; gap: 16px; max-width: 400px;">
        <CoarCard padding="none" variant="outlined"><p style="margin: 0;">No padding</p></CoarCard>
        <CoarCard padding="s" variant="outlined"><p style="margin: 0;">Small padding</p></CoarCard>
        <CoarCard padding="m" variant="outlined"><p style="margin: 0;">Medium padding (default)</p></CoarCard>
        <CoarCard padding="l" variant="outlined"><p style="margin: 0;">Large padding</p></CoarCard>
      </div>
    `,
  }),
};

export const BorderlessAndElevated: Story = {
  render: () => ({
    components: { CoarCard },
    template: `
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;">
        <CoarCard variant="neutral">
          <div style="font-weight: 600;">Default</div>
          <p style="margin: 4px 0 0;">With border (default).</p>
          <p style="margin: 4px 0 0; font-size: 11px; text-transform: uppercase; color: var(--coar-text-neutral-tertiary); letter-spacing: 0.5px;">(Default)</p>
        </CoarCard>
        <CoarCard variant="neutral" borderless>
          <div style="font-weight: 600;">Borderless</div>
          <p style="margin: 4px 0 0;">No border.</p>
          <p style="margin: 4px 0 0; font-size: 11px; text-transform: uppercase; color: var(--coar-text-neutral-tertiary); letter-spacing: 0.5px;">Borderless</p>
        </CoarCard>
        <CoarCard variant="neutral" elevated>
          <div style="font-weight: 600;">Elevated</div>
          <p style="margin: 4px 0 0;">Raised with box-shadow.</p>
          <p style="margin: 4px 0 0; font-size: 11px; text-transform: uppercase; color: var(--coar-text-neutral-tertiary); letter-spacing: 0.5px;">Elevated</p>
        </CoarCard>
        <CoarCard variant="neutral" elevated borderless>
          <div style="font-weight: 600;">Elevated + Borderless</div>
          <p style="margin: 4px 0 0;">Raised, no border.</p>
          <p style="margin: 4px 0 0; font-size: 11px; text-transform: uppercase; color: var(--coar-text-neutral-tertiary); letter-spacing: 0.5px;">Elevated Borderless</p>
        </CoarCard>
      </div>
    `,
  }),
};

export const WithSlots: Story = {
  render: () => ({
    components: { CoarCard },
    template: `
      <CoarCard variant="outlined" style="max-width: 400px;">
        <template #header>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h4 style="margin: 0;">User Profile</h4>
            <span class="coar-caption">Active</span>
          </div>
        </template>
        <p style="margin: 0;">John Doe — john@example.com</p>
        <template #footer>
          <div style="display: flex; justify-content: flex-end; gap: 8px;">
            <a class="coar-link" href="javascript:void(0)">Edit</a>
          </div>
        </template>
      </CoarCard>
    `,
  }),
};
