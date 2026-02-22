import type { Meta, StoryObj } from '@storybook/vue3';
import { CoarTable } from '@cocoar/vue-ui';
import { defineComponent } from 'vue';

const meta: Meta<typeof CoarTable> = {
  title: 'Components/Table',
  component: CoarTable,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['default', 'plain', 'bordered'] },
    compact: { control: 'boolean' },
    hover: { control: 'boolean' },
  },
};
export default meta;
type Story = StoryObj<typeof CoarTable>;

const SampleTable = defineComponent({
  components: { CoarTable },
  props: { variant: { type: String, default: 'default' }, compact: Boolean, hover: { type: Boolean, default: true } },
  template: `
    <CoarTable :variant="variant" :compact="compact" :hover="hover">
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Role</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>John Doe</td>
          <td>john@example.com</td>
          <td>Admin</td>
          <td>Active</td>
        </tr>
        <tr>
          <td>Jane Smith</td>
          <td>jane@example.com</td>
          <td>User</td>
          <td>Active</td>
        </tr>
        <tr>
          <td>Bob Wilson</td>
          <td>bob@example.com</td>
          <td>User</td>
          <td>Inactive</td>
        </tr>
      </tbody>
    </CoarTable>
  `,
});

export const Playground: Story = {
  args: { variant: 'default', compact: false, hover: true },
  render: (args) => ({
    components: { SampleTable },
    setup() { return { args }; },
    template: '<SampleTable v-bind="args" />',
  }),
};

export const Variants: Story = {
  render: () => ({
    components: { SampleTable },
    template: `
      <div style="display: flex; flex-direction: column; gap: 24px;">
        <div>
          <div style="font-weight: 600; margin-bottom: 8px;">Default (Zebra Stripes)</div>
          <SampleTable variant="default" />
        </div>
        <div>
          <div style="font-weight: 600; margin-bottom: 8px;">Plain</div>
          <SampleTable variant="plain" />
        </div>
        <div>
          <div style="font-weight: 600; margin-bottom: 8px;">Bordered</div>
          <SampleTable variant="bordered" />
        </div>
      </div>
    `,
  }),
};

export const Compact: Story = {
  render: () => ({
    components: { SampleTable },
    template: `
      <div style="display: flex; flex-direction: column; gap: 24px;">
        <div>
          <div style="font-weight: 600; margin-bottom: 8px;">Normal</div>
          <SampleTable />
        </div>
        <div>
          <div style="font-weight: 600; margin-bottom: 8px;">Compact</div>
          <SampleTable compact />
        </div>
      </div>
    `,
  }),
};
