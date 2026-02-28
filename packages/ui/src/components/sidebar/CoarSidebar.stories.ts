import type { Meta, StoryObj } from '@storybook/vue3';
import { ref } from 'vue';
import { CoarSidebar, CoarMenu, CoarMenuItem, CoarMenuHeading, CoarMenuDivider, CoarButton, CoarIcon, CoarAvatar } from '@cocoar/vue-ui';

const meta: Meta<typeof CoarSidebar> = {
  title: 'Navigation/Sidebar',
  component: CoarSidebar,
  argTypes: {
    position: { control: 'inline-radio', options: ['left', 'right'] },
    collapsed: { control: 'boolean' },
  },
  args: {
    position: 'left',
    collapsed: false,
  },
};

export default meta;
type Story = StoryObj<typeof CoarSidebar>;

const containerStyle = 'height: 400px; display: flex; border: 1px solid var(--coar-border-neutral-tertiary); border-radius: 8px; overflow: hidden;';
const contentStyle = 'flex: 1; padding: 24px; background: var(--coar-background-neutral-secondary, #fafafa); display: flex; align-items: center; justify-content: center; color: var(--coar-text-neutral-tertiary);';

export const BasicSidebar: Story = {
  render: (args) => ({
    components: { CoarSidebar, CoarMenu, CoarMenuItem, CoarMenuHeading, CoarMenuDivider },
    setup() { return { args, containerStyle, contentStyle }; },
    template: `
      <div :style="containerStyle">
        <CoarSidebar v-bind="args">
          <template #header>
            <div style="padding: 16px; font-weight: 600; font-size: 16px; color: var(--coar-text-neutral-primary);">
              My App
            </div>
          </template>

          <CoarMenu borderless :showIcons="false">
            <CoarMenuHeading>Navigation</CoarMenuHeading>
            <CoarMenuItem label="Dashboard" @clicked="() => {}" />
            <CoarMenuItem label="Projects" @clicked="() => {}" />
            <CoarMenuItem label="Tasks" @clicked="() => {}" />
            <CoarMenuItem label="Calendar" @clicked="() => {}" />
            <CoarMenuDivider />
            <CoarMenuHeading>Settings</CoarMenuHeading>
            <CoarMenuItem label="Profile" @clicked="() => {}" />
            <CoarMenuItem label="Preferences" @clicked="() => {}" />
          </CoarMenu>

          <template #footer>
            <div style="padding: 12px 16px; border-top: 1px solid var(--coar-border-neutral-tertiary); font-size: 12px; color: var(--coar-text-neutral-tertiary);">
              v1.0.0
            </div>
          </template>
        </CoarSidebar>

        <div :style="contentStyle">Main Content Area</div>
      </div>
    `,
  }),
};

export const WithIcons: Story = {
  render: () => ({
    components: { CoarSidebar, CoarMenu, CoarMenuItem, CoarMenuHeading, CoarMenuDivider, CoarAvatar },
    setup() { return { containerStyle, contentStyle }; },
    template: `
      <div :style="containerStyle">
        <CoarSidebar>
          <template #header>
            <div style="padding: 16px; display: flex; align-items: center; gap: 10px;">
              <CoarAvatar name="Cocoar" size="s" />
              <span style="font-weight: 600; color: var(--coar-text-neutral-primary);">Cocoar UI</span>
            </div>
          </template>

          <CoarMenu borderless>
            <CoarMenuItem icon="home" label="Home" @clicked="() => {}" />
            <CoarMenuItem icon="layout-grid" label="Dashboard" @clicked="() => {}" />
            <CoarMenuItem icon="folder" label="Projects" @clicked="() => {}" />
            <CoarMenuItem icon="calendar" label="Calendar" @clicked="() => {}" />
            <CoarMenuDivider />
            <CoarMenuItem icon="settings" label="Settings" @clicked="() => {}" />
          </CoarMenu>

          <template #footer>
            <div style="padding: 12px 16px; border-top: 1px solid var(--coar-border-neutral-tertiary); display: flex; align-items: center; gap: 8px;">
              <CoarAvatar name="John Doe" size="xs" />
              <span style="font-size: 13px; color: var(--coar-text-neutral-secondary);">John Doe</span>
            </div>
          </template>
        </CoarSidebar>

        <div :style="contentStyle">Main Content Area</div>
      </div>
    `,
  }),
};

export const RightPosition: Story = {
  render: () => ({
    components: { CoarSidebar, CoarMenu, CoarMenuItem, CoarMenuDivider },
    setup() { return { containerStyle, contentStyle }; },
    template: `
      <div :style="containerStyle">
        <div :style="contentStyle">Main Content Area</div>

        <CoarSidebar position="right">
          <template #header>
            <div style="padding: 16px; font-weight: 600; color: var(--coar-text-neutral-primary);">
              Details
            </div>
          </template>

          <CoarMenu borderless :showIcons="false">
            <CoarMenuItem label="Properties" @clicked="() => {}" />
            <CoarMenuItem label="History" @clicked="() => {}" />
            <CoarMenuItem label="Comments" @clicked="() => {}" />
          </CoarMenu>
        </CoarSidebar>
      </div>
    `,
  }),
};

export const Collapsible: Story = {
  render: () => ({
    components: { CoarSidebar, CoarMenu, CoarMenuItem, CoarButton, CoarIcon },
    setup() {
      const collapsed = ref(false);
      return { collapsed, containerStyle, contentStyle };
    },
    template: `
      <div>
        <div style="margin-bottom: 12px;">
          <CoarButton size="s" @click="collapsed = !collapsed">
            {{ collapsed ? 'Expand' : 'Collapse' }} Sidebar
          </CoarButton>
        </div>

        <div :style="containerStyle">
          <CoarSidebar :collapsed="collapsed">
            <template #header>
              <div style="padding: 16px; font-weight: 600; color: var(--coar-text-neutral-primary);">
                {{ collapsed ? '☰' : 'Navigation' }}
              </div>
            </template>

            <CoarMenu borderless>
              <CoarMenuItem icon="home" :label="collapsed ? '' : 'Home'" @clicked="() => {}" />
              <CoarMenuItem icon="folder" :label="collapsed ? '' : 'Projects'" @clicked="() => {}" />
              <CoarMenuItem icon="settings" :label="collapsed ? '' : 'Settings'" @clicked="() => {}" />
            </CoarMenu>
          </CoarSidebar>

          <div :style="contentStyle">
            Main Content Area
          </div>
        </div>
      </div>
    `,
  }),
};
