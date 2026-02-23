import type { Meta, StoryObj } from '@storybook/vue3';
import { ref } from 'vue';
import { CoarPopconfirm, CoarButton } from '@cocoar/vue-ui';

const meta: Meta<typeof CoarPopconfirm> = {
  title: 'Overlay/Popconfirm',
  component: CoarPopconfirm,
  tags: ['autodocs'],
  argTypes: {
    message: { control: 'text' },
    title: { control: 'text' },
    confirmText: { control: 'text' },
    cancelText: { control: 'text' },
    confirmVariant: {
      control: 'select',
      options: ['primary', 'danger'],
    },
    placement: {
      control: 'select',
      options: ['top', 'bottom', 'left', 'right'],
    },
    disabled: { control: 'boolean' },
  },
};
export default meta;
type Story = StoryObj<typeof CoarPopconfirm>;

export const Playground: Story = {
  args: {
    message: 'Are you sure you want to delete this item?',
    title: '',
    confirmText: 'OK',
    cancelText: 'Cancel',
    confirmVariant: 'primary',
    placement: 'top',
    disabled: false,
  },
  render: (args) => ({
    components: { CoarPopconfirm, CoarButton },
    setup() {
      const log = ref<string[]>([]);
      const onConfirm = () => log.value.push('✅ Confirmed');
      const onCancel = () => log.value.push('❌ Cancelled');
      return { args, log, onConfirm, onCancel };
    },
    template: `
      <div style="padding: 80px;">
        <CoarPopconfirm
          v-bind="args"
          @confirmed="onConfirm"
          @cancelled="onCancel"
        >
          <CoarButton>Delete</CoarButton>
        </CoarPopconfirm>
        <div v-if="log.length" style="margin-top: 24px; font-size: 14px; color: var(--coar-text-neutral-secondary);">
          <div v-for="(entry, i) in log" :key="i">{{ entry }}</div>
        </div>
      </div>
    `,
  }),
};

export const WithTitle: Story = {
  render: () => ({
    components: { CoarPopconfirm, CoarButton },
    template: `
      <div style="padding: 80px;">
        <CoarPopconfirm
          message="This action cannot be undone."
          title="Warning"
          confirmText="Delete"
          confirmVariant="danger"
        >
          <CoarButton variant="danger">Delete Account</CoarButton>
        </CoarPopconfirm>
      </div>
    `,
  }),
};

export const DangerVariant: Story = {
  render: () => ({
    components: { CoarPopconfirm, CoarButton },
    template: `
      <div style="padding: 80px;">
        <CoarPopconfirm
          message="Revoke all active sessions?"
          confirmText="Revoke"
          confirmVariant="danger"
        >
          <CoarButton variant="danger">Revoke Sessions</CoarButton>
        </CoarPopconfirm>
      </div>
    `,
  }),
};

export const AllPlacements: Story = {
  render: () => ({
    components: { CoarPopconfirm, CoarButton },
    template: `
      <div style="display: flex; gap: 40px; padding: 120px; flex-wrap: wrap; justify-content: center;">
        <CoarPopconfirm message="Top placement" placement="top">
          <CoarButton variant="secondary">Top</CoarButton>
        </CoarPopconfirm>
        <CoarPopconfirm message="Bottom placement" placement="bottom">
          <CoarButton variant="secondary">Bottom</CoarButton>
        </CoarPopconfirm>
        <CoarPopconfirm message="Left placement" placement="left">
          <CoarButton variant="secondary">Left</CoarButton>
        </CoarPopconfirm>
        <CoarPopconfirm message="Right placement" placement="right">
          <CoarButton variant="secondary">Right</CoarButton>
        </CoarPopconfirm>
      </div>
    `,
  }),
};

export const Disabled: Story = {
  render: () => ({
    components: { CoarPopconfirm, CoarButton },
    setup() {
      const disabled = ref(true);
      return { disabled };
    },
    template: `
      <div style="display: flex; gap: 16px; align-items: center; padding: 80px;">
        <CoarPopconfirm message="Are you sure?" :disabled="disabled">
          <CoarButton>Click me</CoarButton>
        </CoarPopconfirm>
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
          <input type="checkbox" v-model="disabled" />
          Disabled
        </label>
      </div>
    `,
  }),
};

export const CustomTexts: Story = {
  render: () => ({
    components: { CoarPopconfirm, CoarButton },
    template: `
      <div style="padding: 80px;">
        <CoarPopconfirm
          message="Mark all notifications as read?"
          title="Confirm"
          confirmText="Yes, mark all"
          cancelText="No, keep unread"
        >
          <CoarButton>Mark All Read</CoarButton>
        </CoarPopconfirm>
      </div>
    `,
  }),
};
