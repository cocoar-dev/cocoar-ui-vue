import type { Meta, StoryObj } from '@storybook/vue3';
import { CoarSwitch } from '@cocoar/vue-ui';
import { ref } from 'vue';

const meta: Meta<typeof CoarSwitch> = {
  title: 'Form Controls/Switch',
  component: CoarSwitch,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['s', 'm', 'l'] },
    labelPosition: { control: 'select', options: ['before', 'after'] },
  },
};
export default meta;
type Story = StoryObj<typeof CoarSwitch>;

export const Playground: Story = {
  args: {
    label: 'Dark mode',
    size: 'm',
    modelValue: false,
  },
};

export const Sizes: Story = {
  render: () => ({
    components: { CoarSwitch },
    template: `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <CoarSwitch label="Small" size="s" :modelValue="true" />
        <CoarSwitch label="Medium (default)" size="m" :modelValue="true" />
        <CoarSwitch label="Large" size="l" :modelValue="true" />
      </div>
    `,
  }),
};

export const States: Story = {
  render: () => ({
    components: { CoarSwitch },
    template: `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <CoarSwitch label="Off" />
        <CoarSwitch label="On" :modelValue="true" />
        <CoarSwitch label="Disabled off" disabled />
        <CoarSwitch label="Disabled on" :modelValue="true" disabled />
        <CoarSwitch label="Readonly on" :modelValue="true" readonly />
      </div>
    `,
  }),
};

export const LabelPosition: Story = {
  render: () => ({
    components: { CoarSwitch },
    template: `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <CoarSwitch label="Label after (default)" labelPosition="after" :modelValue="true" />
        <CoarSwitch label="Label before" labelPosition="before" :modelValue="true" />
      </div>
    `,
  }),
};

export const Interactive: Story = {
  render: () => ({
    components: { CoarSwitch },
    setup() {
      const darkMode = ref(false);
      const notifications = ref(true);
      const autoSave = ref(true);
      return { darkMode, notifications, autoSave };
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 16px; max-width: 300px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>Dark mode</span>
          <CoarSwitch v-model="darkMode" />
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>Notifications</span>
          <CoarSwitch v-model="notifications" />
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>Auto-save</span>
          <CoarSwitch v-model="autoSave" />
        </div>
      </div>
    `,
  }),
};
