import type { Meta, StoryObj } from '@storybook/vue3';
import { defineComponent, ref } from 'vue';
import { useDialog, CoarButton } from '@cocoar/vue-ui';

const DialogDemo = defineComponent({
  components: { CoarButton },
  setup() {
    const dialog = useDialog();
    const lastResult = ref<string>('');

    async function showConfirm() {
      const ref = dialog.confirm({
        title: 'Delete item?',
        message: 'This action cannot be undone. Are you sure you want to delete this item?',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        confirmVariant: 'danger',
      });
      const result = await ref.result;
      lastResult.value = result === true ? 'Confirmed ✓' : 'Cancelled ✗';
    }

    async function showInfo() {
      const ref = dialog.confirm({
        title: 'Changes saved',
        message: 'Your profile has been updated successfully.',
        confirmText: 'OK',
        cancelText: 'Dismiss',
      });
      await ref.result;
      lastResult.value = 'Info dialog closed';
    }

    return { showConfirm, showInfo, lastResult };
  },
  template: `
    <div style="display: flex; flex-wrap: wrap; gap: 12px; padding: 24px; align-items: center;">
      <CoarButton variant="danger" @click="showConfirm">Delete (Confirm)</CoarButton>
      <CoarButton variant="secondary" @click="showInfo">Info Confirm</CoarButton>
      <span v-if="lastResult" style="color: var(--coar-text-neutral-secondary); font-size: 14px;">Result: {{ lastResult }}</span>
    </div>
  `,
});

const meta: Meta<typeof DialogDemo> = {
  title: 'Overlay/Dialog',
  component: DialogDemo,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof DialogDemo>;

export const ConfirmDialog: Story = {};

export const Sizes: Story = {
  render: () => ({
    components: { CoarButton },
    setup() {
      const dialog = useDialog();
      const openSize = (size: 's' | 'm' | 'l') => {
        dialog.confirm({
          title: `${size.toUpperCase()} Dialog`,
          message: `This is a ${size === 's' ? 'small (400px)' : size === 'm' ? 'medium (560px)' : 'large (720px)'} dialog.`,
          size,
        });
      };
      return { openSize };
    },
    template: `
      <div style="display: flex; gap: 12px; padding: 24px;">
        <CoarButton variant="secondary" @click="openSize('s')">Small</CoarButton>
        <CoarButton variant="secondary" @click="openSize('m')">Medium</CoarButton>
        <CoarButton variant="secondary" @click="openSize('l')">Large</CoarButton>
      </div>
    `,
  }),
};

export const CustomContent: Story = {
  render: () => ({
    components: { CoarButton },
    setup() {
      const dialog = useDialog();
      const result = ref('');

      async function openCustom() {
        const CustomBody = defineComponent({
          props: { close: { type: Function, required: true } },
          template: `
            <div>
              <p style="margin: 0 0 16px;">This dialog has custom content rendered via a component.</p>
              <div style="display: flex; gap: 8px;">
                <input type="text" placeholder="Type something..." style="flex: 1; padding: 8px; border: 1px solid var(--coar-border-neutral); border-radius: 4px;" />
              </div>
              <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;">
                <button @click="close('cancelled')" style="padding: 8px 16px; cursor: pointer;">Cancel</button>
                <button @click="close('submitted')" style="padding: 8px 16px; background: var(--coar-background-accent-bold); color: var(--coar-text-on-bold); border: none; border-radius: 4px; cursor: pointer;">Submit</button>
              </div>
            </div>
          `,
        });

        const ref = dialog.open(CustomBody, { title: 'Custom Dialog', size: 'm' });
        const r = await ref.result;
        result.value = String(r ?? 'dismissed');
      }

      return { openCustom, result };
    },
    template: `
      <div style="padding: 24px;">
        <CoarButton @click="openCustom">Open custom dialog</CoarButton>
        <p v-if="result" style="margin-top: 12px; color: var(--coar-text-neutral-secondary); font-size: 14px;">Result: {{ result }}</p>
      </div>
    `,
  }),
};

export const DangerConfirm: Story = {
  render: () => ({
    components: { CoarButton },
    setup() {
      const dialog = useDialog();
      const openDanger = () => {
        dialog.confirm({
          title: 'Delete account?',
          message: 'All your data will be permanently deleted. This cannot be undone.',
          confirmText: 'Delete my account',
          cancelText: 'Keep account',
          confirmVariant: 'danger',
        });
      };
      return { openDanger };
    },
    template: `
      <div style="padding: 24px;">
        <CoarButton variant="danger" @click="openDanger">Delete Account</CoarButton>
      </div>
    `,
  }),
};

export const NoCloseButton: Story = {
  render: () => ({
    components: { CoarButton },
    setup() {
      const dialog = useDialog();
      const openDialog = () => {
        dialog.confirm({
          title: 'Terms of Service',
          message: 'You must accept the terms of service to continue. Click Confirm to accept or Cancel to decline.',
          confirmText: 'Accept',
          cancelText: 'Decline',
        });
      };
      return { openDialog };
    },
    template: `
      <div style="padding: 24px;">
        <CoarButton @click="openDialog">Show Terms Dialog</CoarButton>
        <p style="margin-top: 8px; color: var(--coar-text-neutral-secondary); font-size: 14px;">
          Confirm dialogs have no close button by default. Use backdrop click or Escape to dismiss.
        </p>
      </div>
    `,
  }),
};
