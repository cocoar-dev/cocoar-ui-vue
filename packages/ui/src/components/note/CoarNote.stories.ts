import type { Meta, StoryObj } from '@storybook/vue3';
import { CoarNote } from '@cocoar/vue-ui';

const meta: Meta<typeof CoarNote> = {
  title: 'Components/Note',
  component: CoarNote,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['neutral', 'success', 'warning', 'error', 'info', 'accent'],
    },
    padding: {
      control: 'select',
      options: ['s', 'm', 'l'],
    },
  },
};
export default meta;
type Story = StoryObj<typeof CoarNote>;

export const Playground: Story = {
  args: {
    variant: 'neutral',
    padding: 'm',
  },
  render: (args) => ({
    components: { CoarNote },
    setup() { return { args }; },
    template: '<CoarNote v-bind="args"><strong>Note:</strong> This is an informational note.</CoarNote>',
  }),
};

export const Variants: Story = {
  render: () => ({
    components: { CoarNote },
    template: `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <CoarNote variant="neutral"><strong>Neutral:</strong> General information.</CoarNote>
        <CoarNote variant="info"><strong>Info:</strong> Here is a helpful tip.</CoarNote>
        <CoarNote variant="success"><strong>Success:</strong> Operation completed.</CoarNote>
        <CoarNote variant="warning"><strong>Warning:</strong> Proceed with caution.</CoarNote>
        <CoarNote variant="error"><strong>Error:</strong> Something went wrong.</CoarNote>
        <CoarNote variant="accent"><strong>Accent:</strong> Highlighted information.</CoarNote>
      </div>
    `,
  }),
};

export const PaddingSizes: Story = {
  render: () => ({
    components: { CoarNote },
    template: `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <CoarNote variant="info" padding="s"><strong>Small:</strong> Compact padding.</CoarNote>
        <CoarNote variant="info" padding="m"><strong>Medium:</strong> Default padding.</CoarNote>
        <CoarNote variant="info" padding="l"><strong>Large:</strong> Spacious padding.</CoarNote>
      </div>
    `,
  }),
};

export const RichContent: Story = {
  render: () => ({
    components: { CoarNote },
    template: `
      <CoarNote variant="warning">
        <h4 style="margin: 0 0 8px 0;">Important Notice</h4>
        <p>This action will affect all users in your organization.</p>
        <ul>
          <li>All pending changes will be applied</li>
          <li>Users will be notified via email</li>
          <li>This cannot be reversed</li>
        </ul>
      </CoarNote>
    `,
  }),
};
