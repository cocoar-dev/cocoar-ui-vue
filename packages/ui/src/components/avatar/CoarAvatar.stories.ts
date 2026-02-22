import type { Meta, StoryObj } from '@storybook/vue3';
import { CoarAvatar } from '@cocoar/vue-ui';

const meta: Meta<typeof CoarAvatar> = {
  title: 'Components/Avatar',
  component: CoarAvatar,
  tags: ['autodocs'],
  argTypes: {
    src: { control: 'text' },
    name: { control: 'text' },
    size: { control: 'select', options: ['xs', 's', 'm', 'l', 'xl', 'xxl'] },
    shape: { control: 'select', options: ['circle', 'square'] },
    clickable: { control: 'boolean' },
    initials: { control: 'text' },
    bgColor: { control: 'color' },
  },
};
export default meta;
type Story = StoryObj<typeof CoarAvatar>;

export const Playground: Story = {
  args: { name: 'Alice Johnson', size: 'm' },
};

export const Sizes: Story = {
  render: () => ({
    components: { CoarAvatar },
    template: `
      <div style="display: flex; gap: 12px; align-items: center;">
        <CoarAvatar name="Alice" size="xs" />
        <CoarAvatar name="Bob" size="s" />
        <CoarAvatar name="Carol" size="m" />
        <CoarAvatar name="Dave" size="l" />
        <CoarAvatar name="Eve" size="xl" />
        <CoarAvatar name="Frank" size="xxl" />
      </div>
    `,
  }),
};

export const Shapes: Story = {
  render: () => ({
    components: { CoarAvatar },
    template: `
      <div style="display: flex; gap: 12px; align-items: center;">
        <CoarAvatar name="Circle" size="l" />
        <CoarAvatar name="Square" size="l" shape="square" />
      </div>
    `,
  }),
};

export const WithImages: Story = {
  render: () => ({
    components: { CoarAvatar },
    template: `
      <div style="display: flex; gap: 12px; align-items: center;">
        <CoarAvatar src="https://i.pravatar.cc/150?u=alice" name="Alice" size="l" />
        <CoarAvatar src="https://i.pravatar.cc/150?u=bob" name="Bob" size="l" />
        <CoarAvatar src="https://broken-url.invalid/avatar.jpg" name="Fallback" size="l" />
      </div>
    `,
  }),
};

export const AutoColors: Story = {
  render: () => ({
    components: { CoarAvatar },
    template: `
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <CoarAvatar v-for="name in ['Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank', 'Grace', 'Hank', 'Ivy', 'Jack']" :key="name" :name="name" size="l" />
      </div>
    `,
  }),
};
