import type { Meta, StoryObj } from '@storybook/vue3';
import { CoarTag } from '@cocoar/vue-ui';

const meta: Meta<typeof CoarTag> = {
  title: 'Components/Tag',
  component: CoarTag,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['neutral', 'success', 'warning', 'error', 'info', 'accent'],
    },
    size: { control: 'select', options: ['s', 'm', 'l'] },
    elevated: { control: 'boolean' },
    borderless: { control: 'boolean' },
    closable: { control: 'boolean' },
  },
};
export default meta;
type Story = StoryObj<typeof CoarTag>;

export const Playground: Story = {
  args: { variant: 'neutral', size: 'm' },
  render: (args) => ({
    components: { CoarTag },
    setup() { return { args }; },
    template: '<CoarTag v-bind="args">Label</CoarTag>',
  }),
};

export const Variants: Story = {
  render: () => ({
    components: { CoarTag },
    template: `
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <CoarTag variant="neutral">Neutral</CoarTag>
        <CoarTag variant="success">Success</CoarTag>
        <CoarTag variant="warning">Warning</CoarTag>
        <CoarTag variant="error">Error</CoarTag>
        <CoarTag variant="info">Info</CoarTag>
        <CoarTag variant="accent">Accent</CoarTag>
      </div>
    `,
  }),
};

export const Sizes: Story = {
  render: () => ({
    components: { CoarTag },
    template: `
      <div style="display: flex; gap: 8px; align-items: center;">
        <CoarTag size="s">Small</CoarTag>
        <CoarTag size="m">Medium</CoarTag>
        <CoarTag size="l">Large</CoarTag>
      </div>
    `,
  }),
};

export const Closable: Story = {
  render: () => ({
    components: { CoarTag },
    setup() {
      const onClosed = () => alert('Tag closed!');
      return { onClosed };
    },
    template: `
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <CoarTag closable @closed="onClosed">Removable</CoarTag>
        <CoarTag variant="success" closable @closed="onClosed">Published</CoarTag>
        <CoarTag variant="warning" closable @closed="onClosed">Draft</CoarTag>
        <CoarTag variant="error" closable @closed="onClosed">Rejected</CoarTag>
      </div>
    `,
  }),
};

export const BorderlessAndElevated: Story = {
  render: () => ({
    components: { CoarTag },
    template: `
      <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
        <CoarTag variant="accent">Default</CoarTag>
        <CoarTag variant="accent" borderless>Borderless</CoarTag>
        <CoarTag variant="accent" elevated>Elevated</CoarTag>
        <CoarTag variant="accent" elevated borderless>Both</CoarTag>
      </div>
    `,
  }),
};
