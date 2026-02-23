import type { Meta, StoryObj } from '@storybook/vue3';
import { CoarPopover, CoarButton } from '@cocoar/vue-ui';

const meta: Meta<typeof CoarPopover> = {
  title: 'Overlay/Popover',
  component: CoarPopover,
  tags: ['autodocs'],
  argTypes: {
    mode: { control: 'select', options: ['hover', 'click', 'both'] },
    disabled: { control: 'boolean' },
    interactive: { control: 'boolean' },
    offset: { control: { type: 'number', min: 0, max: 24 } },
  },
  args: {
    mode: 'hover',
    disabled: false,
    interactive: true,
    offset: 6,
  },
};
export default meta;
type Story = StoryObj<typeof CoarPopover>;

export const Playground: Story = {
  render: (args) => ({
    components: { CoarPopover, CoarButton },
    setup: () => ({ args }),
    template: `
      <div style="padding: 80px;">
        <CoarPopover v-bind="args">
          <CoarButton>Hover me</CoarButton>
          <template #content>
            <div>
              <strong>Popover title</strong>
              <p style="margin: 8px 0 0;">This is rich content inside a popover panel. It supports any HTML or components.</p>
            </div>
          </template>
        </CoarPopover>
      </div>
    `,
  }),
};

export const ClickMode: Story = {
  render: () => ({
    components: { CoarPopover, CoarButton },
    template: `
      <div style="padding: 80px;">
        <CoarPopover mode="click">
          <CoarButton>Click to toggle</CoarButton>
          <template #content>
            <p>Click the button again or click outside to close.</p>
          </template>
        </CoarPopover>
      </div>
    `,
  }),
};

export const BothMode: Story = {
  render: () => ({
    components: { CoarPopover, CoarButton },
    template: `
      <div style="padding: 80px;">
        <CoarPopover mode="both">
          <CoarButton>Hover or click</CoarButton>
          <template #content>
            <p>Opens on hover. Click to <strong>pin</strong> it open (won't close on mouse leave). Click again to close.</p>
          </template>
        </CoarPopover>
      </div>
    `,
  }),
};

export const Disabled: Story = {
  render: () => ({
    components: { CoarPopover, CoarButton },
    template: `
      <div style="padding: 80px;">
        <CoarPopover mode="hover" disabled>
          <CoarButton>Disabled popover</CoarButton>
          <template #content>
            <p>You should not see this.</p>
          </template>
        </CoarPopover>
      </div>
    `,
  }),
};

export const RichContent: Story = {
  render: () => ({
    components: { CoarPopover, CoarButton },
    template: `
      <div style="padding: 80px;">
        <CoarPopover mode="click">
          <CoarButton>User profile</CoarButton>
          <template #content>
            <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 12px;">
              <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--coar-background-accent-bold); display: flex; align-items: center; justify-content: center; color: var(--coar-text-on-bold); font-weight: 600;">JD</div>
              <div>
                <strong>Jane Doe</strong>
                <div style="font-size: 12px; color: var(--coar-text-neutral-secondary);">jane.doe@example.com</div>
              </div>
            </div>
            <hr style="border: none; border-top: 1px solid var(--coar-border-neutral); margin: 8px 0;" />
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <a href="#" style="text-decoration: none; color: var(--coar-text-neutral-primary); padding: 4px 0;">Profile</a>
              <a href="#" style="text-decoration: none; color: var(--coar-text-neutral-primary); padding: 4px 0;">Settings</a>
              <a href="#" style="text-decoration: none; color: var(--coar-text-semantic-error-bold); padding: 4px 0;">Sign out</a>
            </div>
          </template>
        </CoarPopover>
      </div>
    `,
  }),
};

export const NonInteractive: Story = {
  render: () => ({
    components: { CoarPopover, CoarButton },
    template: `
      <div style="padding: 80px;">
        <CoarPopover mode="hover" :interactive="false">
          <CoarButton>Hover (non-interactive panel)</CoarButton>
          <template #content>
            <p>This panel has <code>pointer-events: none</code> — you can't interact with it.</p>
          </template>
        </CoarPopover>
      </div>
    `,
  }),
};

export const MultiplePopovers: Story = {
  render: () => ({
    components: { CoarPopover, CoarButton },
    template: `
      <div style="padding: 80px; display: flex; gap: 24px;">
        <CoarPopover mode="hover">
          <CoarButton variant="secondary">Item 1</CoarButton>
          <template #content><p>Details for item 1</p></template>
        </CoarPopover>
        <CoarPopover mode="hover">
          <CoarButton variant="secondary">Item 2</CoarButton>
          <template #content><p>Details for item 2</p></template>
        </CoarPopover>
        <CoarPopover mode="hover">
          <CoarButton variant="secondary">Item 3</CoarButton>
          <template #content><p>Details for item 3</p></template>
        </CoarPopover>
      </div>
    `,
  }),
};
