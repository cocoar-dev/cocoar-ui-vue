import type { Meta, StoryObj } from '@storybook/vue3';
import { ref } from 'vue';
import { CoarPagination } from '@cocoar/vue-ui';

const meta: Meta<typeof CoarPagination> = {
  title: 'Components/Pagination',
  component: CoarPagination,
  argTypes: {
    totalItems: { control: { type: 'number', min: 0 } },
    pageSize: { control: { type: 'number', min: 1 } },
    maxVisiblePages: { control: { type: 'number', min: 3, max: 10 } },
    showFirstLast: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  args: {
    totalItems: 100,
    pageSize: 10,
    maxVisiblePages: 5,
    showFirstLast: true,
    disabled: false,
  },
};

export default meta;
type Story = StoryObj<typeof CoarPagination>;

export const Playground: Story = {
  render: (args) => ({
    components: { CoarPagination },
    setup() {
      const page = ref(1);
      return { args, page };
    },
    template: `
      <div>
        <CoarPagination v-bind="args" v-model="page" />
        <p style="margin-top: 12px; color: var(--coar-text-neutral-secondary); font-size: 13px;">
          Page {{ page }} of {{ Math.ceil(args.totalItems / args.pageSize) }}
        </p>
      </div>
    `,
  }),
};

export const FewPages: Story = {
  render: () => ({
    components: { CoarPagination },
    setup() {
      const page = ref(1);
      return { page };
    },
    template: `
      <div>
        <CoarPagination :totalItems="30" :pageSize="10" v-model="page" />
        <p style="margin-top: 8px; color: var(--coar-text-neutral-secondary); font-size: 13px;">
          3 pages — no ellipsis needed
        </p>
      </div>
    `,
  }),
};

export const ManyPages: Story = {
  render: () => ({
    components: { CoarPagination },
    setup() {
      const page = ref(1);
      return { page };
    },
    template: `
      <div>
        <CoarPagination :totalItems="500" :pageSize="10" v-model="page" />
        <p style="margin-top: 8px; color: var(--coar-text-neutral-secondary); font-size: 13px;">
          Page {{ page }} of 50 — ellipsis appears when needed
        </p>
      </div>
    `,
  }),
};

export const WithoutFirstLast: Story = {
  render: () => ({
    components: { CoarPagination },
    setup() {
      const page = ref(5);
      return { page };
    },
    template: `
      <CoarPagination :totalItems="200" :pageSize="10" :showFirstLast="false" v-model="page" />
    `,
  }),
};

export const Disabled: Story = {
  render: () => ({
    components: { CoarPagination },
    setup() {
      const page = ref(3);
      return { page };
    },
    template: `
      <CoarPagination :totalItems="100" :pageSize="10" disabled v-model="page" />
    `,
  }),
};
