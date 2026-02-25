import type { Meta, StoryObj } from '@storybook/vue3';
import { CoarNavbar, CoarButton, CoarAvatar, CoarIcon } from '@cocoar/vue-ui';

const meta: Meta<typeof CoarNavbar> = {
  title: 'Components/Navbar',
  component: CoarNavbar,
  argTypes: {
    elevated: { control: 'boolean' },
    bordered: { control: 'boolean' },
  },
  args: {
    elevated: true,
    bordered: false,
  },
};

export default meta;
type Story = StoryObj<typeof CoarNavbar>;

export const BasicNavbar: Story = {
  render: (args) => ({
    components: { CoarNavbar, CoarButton, CoarAvatar },
    setup() { return { args }; },
    template: `
      <CoarNavbar v-bind="args">
        <template #start>
          <span style="font-weight: 700; font-size: 18px; color: var(--coar-text-neutral-primary);">MyApp</span>
        </template>
        <template #end>
          <CoarButton variant="ghost" size="s">Docs</CoarButton>
          <CoarButton variant="ghost" size="s">Help</CoarButton>
          <CoarAvatar name="Jane Smith" size="s" />
        </template>
      </CoarNavbar>
    `,
  }),
};

export const WithCenterNav: Story = {
  render: () => ({
    components: { CoarNavbar, CoarButton, CoarAvatar, CoarIcon },
    template: `
      <CoarNavbar>
        <template #start>
          <CoarIcon name="box" size="m" />
          <span style="font-weight: 700; font-size: 16px;">Cocoar</span>
        </template>
        <template #center>
          <a href="#" style="text-decoration: none; color: var(--coar-text-accent-primary); font-weight: 500; font-size: 14px;">Dashboard</a>
          <a href="#" style="text-decoration: none; color: var(--coar-text-neutral-secondary); font-size: 14px;">Projects</a>
          <a href="#" style="text-decoration: none; color: var(--coar-text-neutral-secondary); font-size: 14px;">Reports</a>
          <a href="#" style="text-decoration: none; color: var(--coar-text-neutral-secondary); font-size: 14px;">Settings</a>
        </template>
        <template #end>
          <CoarButton variant="primary" size="s">New Project</CoarButton>
          <CoarAvatar name="John Doe" size="s" />
        </template>
      </CoarNavbar>
    `,
  }),
};

export const Bordered: Story = {
  render: () => ({
    components: { CoarNavbar, CoarButton },
    template: `
      <CoarNavbar :elevated="false" bordered>
        <template #start>
          <span style="font-weight: 700; font-size: 16px;">App</span>
        </template>
        <template #end>
          <CoarButton variant="ghost" size="s">Sign In</CoarButton>
          <CoarButton variant="primary" size="s">Sign Up</CoarButton>
        </template>
      </CoarNavbar>
    `,
  }),
};

export const WithSidebar: Story = {
  render: () => ({
    components: { CoarNavbar, CoarButton, CoarAvatar, CoarIcon },
    template: `
      <div style="height: 400px; display: flex; flex-direction: column; border: 1px solid var(--coar-border-neutral-tertiary); border-radius: 8px; overflow: hidden;">
        <CoarNavbar>
          <template #start>
            <CoarIcon name="box" size="m" />
            <span style="font-weight: 700; font-size: 16px;">Cocoar UI</span>
          </template>
          <template #end>
            <CoarButton variant="ghost" size="s" icon="bell" />
            <CoarAvatar name="Admin" size="s" />
          </template>
        </CoarNavbar>

        <div style="flex: 1; display: flex; background: var(--coar-background-neutral-secondary, #fafafa);">
          <div style="width: 200px; background: var(--coar-background-neutral-primary); border-right: 1px solid var(--coar-border-neutral-tertiary); padding: 12px; font-size: 14px;">
            <div style="padding: 8px; color: var(--coar-text-neutral-secondary);">Dashboard</div>
            <div style="padding: 8px; color: var(--coar-text-neutral-secondary);">Projects</div>
            <div style="padding: 8px; color: var(--coar-text-neutral-secondary);">Settings</div>
          </div>
          <div style="flex: 1; display: flex; align-items: center; justify-content: center; color: var(--coar-text-neutral-tertiary);">
            Main Content
          </div>
        </div>
      </div>
    `,
  }),
};
