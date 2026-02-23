import type { Meta, StoryObj } from '@storybook/vue3';
import { CoarCheckbox } from '@cocoar/vue-ui';
import { ref } from 'vue';

const meta: Meta<typeof CoarCheckbox> = {
  title: 'Form Controls/Checkbox',
  component: CoarCheckbox,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['xs', 's', 'm', 'l'] },
  },
};
export default meta;
type Story = StoryObj<typeof CoarCheckbox>;

export const Playground: Story = {
  args: {
    label: 'Accept terms and conditions',
    size: 'm',
  },
};

export const Sizes: Story = {
  render: () => ({
    components: { CoarCheckbox },
    template: `
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <CoarCheckbox label="Extra Small" size="xs" :modelValue="true" />
        <CoarCheckbox label="Small" size="s" :modelValue="true" />
        <CoarCheckbox label="Medium (default)" size="m" :modelValue="true" />
        <CoarCheckbox label="Large" size="l" :modelValue="true" />
      </div>
    `,
  }),
};

export const States: Story = {
  render: () => ({
    components: { CoarCheckbox },
    template: `
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <CoarCheckbox label="Unchecked" />
        <CoarCheckbox label="Checked" :modelValue="true" />
        <CoarCheckbox label="Indeterminate" :indeterminate="true" />
        <CoarCheckbox label="Disabled unchecked" disabled />
        <CoarCheckbox label="Disabled checked" :modelValue="true" disabled />
        <CoarCheckbox label="Readonly checked" :modelValue="true" readonly />
        <CoarCheckbox label="Required" required />
        <CoarCheckbox label="With error" error="You must accept the terms" />
        <CoarCheckbox label="With hint" hint="Optional but recommended" />
      </div>
    `,
  }),
};

export const SelectAll: Story = {
  render: () => ({
    components: { CoarCheckbox },
    setup() {
      const items = ref([
        { label: 'Option A', checked: true },
        { label: 'Option B', checked: false },
        { label: 'Option C', checked: true },
      ]);
      const allChecked = ref(false);
      const someChecked = ref(true);

      function updateParent() {
        const checkedCount = items.value.filter(i => i.checked).length;
        allChecked.value = checkedCount === items.value.length;
        someChecked.value = checkedCount > 0 && checkedCount < items.value.length;
      }

      function toggleAll(val: boolean) {
        items.value.forEach(i => (i.checked = val));
        updateParent();
      }

      function toggleItem() {
        updateParent();
      }

      updateParent();

      return { items, allChecked, someChecked, toggleAll, toggleItem };
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 4px;">
        <CoarCheckbox
          label="Select All"
          :modelValue="allChecked"
          :indeterminate="someChecked"
          @update:modelValue="toggleAll"
        />
        <div style="margin-left: 28px; display: flex; flex-direction: column; gap: 4px;">
          <CoarCheckbox
            v-for="item in items"
            :key="item.label"
            :label="item.label"
            v-model="item.checked"
            @update:modelValue="toggleItem"
          />
        </div>
      </div>
    `,
  }),
};
