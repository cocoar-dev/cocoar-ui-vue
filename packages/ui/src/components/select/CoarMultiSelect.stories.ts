import type { Meta, StoryObj } from '@storybook/vue3';
import { ref } from 'vue';
import CoarMultiSelect from './CoarMultiSelect.vue';
import type { CoarSelectOption } from './types';

const frameworkOptions: CoarSelectOption[] = [
  { value: 'vue', label: 'Vue' },
  { value: 'react', label: 'React' },
  { value: 'angular', label: 'Angular' },
  { value: 'svelte', label: 'Svelte' },
  { value: 'solid', label: 'SolidJS' },
  { value: 'preact', label: 'Preact', disabled: true },
  { value: 'lit', label: 'Lit' },
  { value: 'qwik', label: 'Qwik' },
];

const meta: Meta<typeof CoarMultiSelect> = {
  title: 'Form Controls/MultiSelect',
  component: CoarMultiSelect,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['xs', 's', 'm', 'l'] },
    appearance: { control: 'select', options: ['outline', 'inline'] },
  },
};

export default meta;
type Story = StoryObj<typeof CoarMultiSelect>;

export const Playground: Story = {
  args: {
    label: 'Frameworks',
    placeholder: 'Select frameworks...',
    options: frameworkOptions,
    size: 'm',
    searchable: true,
    clearable: true,
    showSelectAll: true,
    hint: 'Choose one or more',
  },
  render: (args) => ({
    components: { CoarMultiSelect },
    setup() {
      const value = ref<unknown[]>([]);
      return { args, value };
    },
    template: `
      <div style="width: 320px;">
        <CoarMultiSelect v-bind="args" v-model="value" />
        <p style="margin-top: 16px; font-size: 13px; color: var(--coar-text-neutral-secondary);">
          Selected: <strong>{{ value.length > 0 ? value.join(', ') : 'none' }}</strong>
        </p>
      </div>
    `,
  }),
};

export const WithSelectAll: Story = {
  render: () => ({
    components: { CoarMultiSelect },
    setup() {
      const value = ref<unknown[]>([]);
      return { value, frameworkOptions };
    },
    template: `
      <div style="width: 320px;">
        <CoarMultiSelect
          v-model="value"
          label="Frameworks"
          :options="frameworkOptions"
          showSelectAll
          selectAllLabel="Select All Frameworks"
          clearable
        />
        <p style="margin-top: 16px; font-size: 13px; color: var(--coar-text-neutral-secondary);">
          Selected: {{ value.length }} / {{ frameworkOptions.filter(o => !o.disabled).length }}
        </p>
      </div>
    `,
  }),
};

export const Sizes: Story = {
  render: () => ({
    components: { CoarMultiSelect },
    setup() {
      const values = ref<Record<string, unknown[]>>({});
      return { values, frameworkOptions };
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 24px; width: 320px;">
        <CoarMultiSelect v-model="values.xs" label="Extra Small" size="xs" :options="frameworkOptions" />
        <CoarMultiSelect v-model="values.s" label="Small" size="s" :options="frameworkOptions" />
        <CoarMultiSelect v-model="values.m" label="Medium" size="m" :options="frameworkOptions" />
        <CoarMultiSelect v-model="values.l" label="Large" size="l" :options="frameworkOptions" />
      </div>
    `,
  }),
};

export const States: Story = {
  render: () => ({
    components: { CoarMultiSelect },
    setup() {
      const value = ref<unknown[]>(['vue', 'angular']);
      return { value, frameworkOptions };
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 24px; width: 320px;">
        <CoarMultiSelect v-model="value" label="Normal" :options="frameworkOptions" />
        <CoarMultiSelect v-model="value" label="With Error" :options="frameworkOptions" error="Select at least 3" />
        <CoarMultiSelect v-model="value" label="Disabled" :options="frameworkOptions" disabled />
        <CoarMultiSelect v-model="value" label="Readonly" :options="frameworkOptions" readonly />
      </div>
    `,
  }),
};
