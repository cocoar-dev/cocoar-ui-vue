import type { Meta, StoryObj } from '@storybook/vue3';
import CoarIcon from './CoarIcon.vue';
import { CORE_ICONS } from './core-icons';

const iconNames = Object.keys(CORE_ICONS).sort();

const meta: Meta<typeof CoarIcon> = {
  title: 'General/Icon',
  component: CoarIcon,
  tags: ['autodocs'],
  argTypes: {
    name: {
      control: 'select',
      options: iconNames,
    },
    size: {
      control: 'select',
      options: ['xs', 's', 'm', 'l', 'xl', 'auto'],
    },
    rotate: { control: { type: 'range', min: 0, max: 360, step: 15 } },
    spin: { control: 'boolean' },
    color: { control: 'color' },
    label: { control: 'text' },
  },
  args: {
    name: 'settings',
    size: 'm',
    rotate: 0,
    spin: false,
    color: 'inherit',
  },
};

export default meta;
type Story = StoryObj<typeof CoarIcon>;

/** Interactive playground — use Controls to explore all props */
export const Playground: Story = {
  render: (args) => ({
    components: { CoarIcon },
    setup: () => ({ args }),
    template: '<CoarIcon v-bind="args" />',
  }),
};

/** Size scale from xs (12px) to xl (32px) */
export const Sizes: Story = {
  render: () => ({
    components: { CoarIcon },
    template: `
      <div style="display: flex; gap: 16px; align-items: center;">
        <span v-for="size in ['xs', 's', 'm', 'l', 'xl']" :key="size"
              style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
          <CoarIcon name="settings" :size="size" />
          <span style="font-size: 11px; color: #999;">{{ size }}</span>
        </span>
      </div>
    `,
  }),
};

/** Browse all ${iconNames.length} built-in icons */
export const AllIcons: Story = {
  render: () => ({
    components: { CoarIcon },
    setup: () => ({ iconNames }),
    template: `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 8px;">
        <div v-for="name in iconNames" :key="name"
             style="display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 12px 4px; border-radius: 6px; border: 1px solid #eee;">
          <CoarIcon :name="name" size="l" />
          <span style="font-size: 10px; color: #666; word-break: break-all; text-align: center;">{{ name }}</span>
        </div>
      </div>
    `,
  }),
};

/** Spin, rotation, and color features */
export const Features: Story = {
  render: () => ({
    components: { CoarIcon },
    template: `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <div>
          <strong style="display: block; margin-bottom: 8px; font-family: Poppins, sans-serif; font-size: 13px; color: #6b6b6b;">Spin</strong>
          <div style="display: flex; gap: 16px; align-items: center;">
            <CoarIcon name="load" size="l" spin />
            <CoarIcon name="settings" size="l" spin />
          </div>
        </div>
        <div>
          <strong style="display: block; margin-bottom: 8px; font-family: Poppins, sans-serif; font-size: 13px; color: #6b6b6b;">Rotation</strong>
          <div style="display: flex; gap: 16px; align-items: center;">
            <CoarIcon name="chevron-right" size="l" :rotate="0" />
            <CoarIcon name="chevron-right" size="l" :rotate="90" />
            <CoarIcon name="chevron-right" size="l" :rotate="180" />
            <CoarIcon name="chevron-right" size="l" :rotate="270" />
          </div>
        </div>
        <div>
          <strong style="display: block; margin-bottom: 8px; font-family: Poppins, sans-serif; font-size: 13px; color: #6b6b6b;">Colors</strong>
          <div style="display: flex; gap: 16px; align-items: center;">
            <CoarIcon name="home" size="l" color="var(--coar-text-accent-primary)" />
            <CoarIcon name="home" size="l" color="var(--coar-text-semantic-error-bold)" />
            <CoarIcon name="home" size="l" color="var(--coar-text-semantic-success-bold)" />
            <CoarIcon name="home" size="l" color="#ff6600" />
          </div>
        </div>
        <div>
          <strong style="display: block; margin-bottom: 8px; font-family: Poppins, sans-serif; font-size: 13px; color: #6b6b6b;">With Label</strong>
          <div style="display: flex; gap: 24px; align-items: center;">
            <CoarIcon name="settings" label="Settings" />
            <CoarIcon name="user" label="Profile" />
            <CoarIcon name="home" :label="42" />
          </div>
        </div>
      </div>
    `,
  }),
};
