import type { Meta, StoryObj } from '@storybook/vue3';
import { defineComponent } from 'vue';
import { useToast, CoarButton } from '@cocoar/vue-ui';

const ToastDemo = defineComponent({
  components: { CoarButton },
  setup() {
    const toast = useToast();
    return { toast };
  },
  template: `
    <div style="display: flex; flex-wrap: wrap; gap: 12px; padding: 24px;">
      <CoarButton @click="toast.success('Operation completed successfully!')">Success</CoarButton>
      <CoarButton variant="danger" @click="toast.error('Something went wrong.', { title: 'Error' })">Error</CoarButton>
      <CoarButton variant="secondary" @click="toast.warning('Please review before continuing.')">Warning</CoarButton>
      <CoarButton variant="secondary" @click="toast.info('A new update is available.', { title: 'Info' })">Info</CoarButton>
    </div>
  `,
});

const meta: Meta<typeof ToastDemo> = {
  title: 'Overlay/Toast',
  component: ToastDemo,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof ToastDemo>;

export const Playground: Story = {};

export const WithTitle: Story = {
  render: () => ({
    components: { CoarButton },
    setup() {
      const toast = useToast();
      return { toast };
    },
    template: `
      <div style="display: flex; flex-wrap: wrap; gap: 12px; padding: 24px;">
        <CoarButton @click="toast.success('File uploaded.', { title: 'Upload Complete' })">Success with title</CoarButton>
        <CoarButton variant="danger" @click="toast.error('Could not save changes.', { title: 'Save Failed' })">Error with title</CoarButton>
        <CoarButton variant="secondary" @click="toast.warning('Disk space running low.', { title: 'Warning' })">Warning with title</CoarButton>
        <CoarButton variant="secondary" @click="toast.info('Your session will expire soon.', { title: 'Session Notice' })">Info with title</CoarButton>
      </div>
    `,
  }),
};

export const WithAction: Story = {
  render: () => ({
    components: { CoarButton },
    setup() {
      const toast = useToast();
      const showWithAction = () => {
        toast.info('Email moved to trash.', {
          action: {
            label: 'Undo',
            callback: () => toast.success('Action undone!'),
          },
        });
      };
      return { showWithAction };
    },
    template: `
      <div style="padding: 24px;">
        <CoarButton @click="showWithAction">Show toast with action</CoarButton>
      </div>
    `,
  }),
};

export const Positions: Story = {
  render: () => ({
    components: { CoarButton },
    setup() {
      const toast = useToast();
      const positions = ['top-right', 'top-left', 'top-center', 'bottom-right', 'bottom-left', 'bottom-center'] as const;
      const showAt = (pos: typeof positions[number]) => {
        toast.info(`Toast at ${pos}`, { position: pos, duration: 3000 });
      };
      return { positions, showAt };
    },
    template: `
      <div style="display: flex; flex-wrap: wrap; gap: 12px; padding: 24px;">
        <CoarButton v-for="pos in positions" :key="pos" variant="secondary" @click="showAt(pos)">
          {{ pos }}
        </CoarButton>
      </div>
    `,
  }),
};

export const NoDismiss: Story = {
  render: () => ({
    components: { CoarButton },
    setup() {
      const toast = useToast();
      return { toast };
    },
    template: `
      <div style="padding: 24px;">
        <CoarButton @click="toast.info('This toast auto-closes but has no X button.', { dismissible: false, duration: 4000 })">
          Non-dismissible
        </CoarButton>
      </div>
    `,
  }),
};

export const PersistentError: Story = {
  render: () => ({
    components: { CoarButton },
    setup() {
      const toast = useToast();
      return { toast };
    },
    template: `
      <div style="padding: 24px;">
        <CoarButton variant="danger" @click="toast.error('Connection lost. Please check your network.', { title: 'Network Error' })">
          Persistent error (no auto-close)
        </CoarButton>
        <p style="margin-top: 12px; color: var(--coar-text-neutral-secondary); font-size: 14px;">
          Error toasts default to duration: 0 (no auto-close). Must be dismissed manually.
        </p>
      </div>
    `,
  }),
};

export const DismissAll: Story = {
  render: () => ({
    components: { CoarButton },
    setup() {
      const toast = useToast();
      const spamToasts = () => {
        toast.success('Toast 1');
        toast.info('Toast 2');
        toast.warning('Toast 3');
      };
      return { toast, spamToasts };
    },
    template: `
      <div style="display: flex; gap: 12px; padding: 24px;">
        <CoarButton @click="spamToasts">Add 3 toasts</CoarButton>
        <CoarButton variant="secondary" @click="toast.dismissAll()">Dismiss all</CoarButton>
      </div>
    `,
  }),
};
