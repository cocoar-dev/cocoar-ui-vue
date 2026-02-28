import type { Meta, StoryObj } from '@storybook/vue3';
import { ref } from 'vue';
import CoarTagSelect from './CoarTagSelect.vue';
import type { CoarSelectOption } from './types';

const skillOptions: CoarSelectOption[] = [
  { value: 'typescript', label: 'TypeScript' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
  { value: 'rust', label: 'Rust' },
  { value: 'go', label: 'Go' },
  { value: 'java', label: 'Java' },
  { value: 'csharp', label: 'C#' },
  { value: 'kotlin', label: 'Kotlin' },
  { value: 'swift', label: 'Swift' },
  { value: 'dart', label: 'Dart' },
];

const meta: Meta<typeof CoarTagSelect> = {
  title: 'Form Controls/TagSelect',
  component: CoarTagSelect,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['xs', 's', 'm', 'l'] },
    appearance: { control: 'select', options: ['outline', 'inline'] },
  },
};

export default meta;
type Story = StoryObj<typeof CoarTagSelect>;

export const Playground: Story = {
  args: {
    label: 'Skills',
    placeholder: 'Type to search...',
    options: skillOptions,
    size: 'm',
    hint: 'Select your skills',
  },
  render: (args) => ({
    components: { CoarTagSelect },
    setup() {
      const value = ref<unknown[]>([]);
      return { args, value };
    },
    template: `
      <div style="width: 400px;">
        <CoarTagSelect v-bind="args" v-model="value" />
        <p style="margin-top: 16px; font-size: 13px; color: var(--coar-text-neutral-secondary);">
          Selected: <strong>{{ value.length > 0 ? value.join(', ') : 'none' }}</strong>
        </p>
      </div>
    `,
  }),
};

export const WithPreselected: Story = {
  render: () => ({
    components: { CoarTagSelect },
    setup() {
      const value = ref<unknown[]>(['typescript', 'rust', 'python']);
      return { value, skillOptions };
    },
    template: `
      <div style="width: 400px;">
        <CoarTagSelect v-model="value" label="Skills" :options="skillOptions" />
      </div>
    `,
  }),
};

export const AllowCreate: Story = {
  render: () => ({
    components: { CoarTagSelect },
    setup() {
      const value = ref<unknown[]>([]);
      return { value, skillOptions };
    },
    template: `
      <div style="width: 400px;">
        <CoarTagSelect
          v-model="value"
          label="Skills (custom tags allowed)"
          :options="skillOptions"
          allowCreate
          hint="Type and press Enter to create new tags"
        />
        <p style="margin-top: 16px; font-size: 13px; color: var(--coar-text-neutral-secondary);">
          Values: <strong>{{ value.join(', ') || 'none' }}</strong>
        </p>
      </div>
    `,
  }),
};

export const States: Story = {
  render: () => ({
    components: { CoarTagSelect },
    setup() {
      const value = ref<unknown[]>(['typescript', 'rust']);
      return { value, skillOptions };
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 24px; width: 400px;">
        <CoarTagSelect v-model="value" label="Normal" :options="skillOptions" />
        <CoarTagSelect v-model="value" label="With Error" :options="skillOptions" error="At least 3 required" />
        <CoarTagSelect v-model="value" label="Disabled" :options="skillOptions" disabled />
        <CoarTagSelect v-model="value" label="Readonly" :options="skillOptions" readonly />
      </div>
    `,
  }),
};

export const Sizes: Story = {
  render: () => ({
    components: { CoarTagSelect },
    setup() {
      const values = ref<Record<string, unknown[]>>({
        xs: ['typescript'],
        s: ['typescript', 'rust'],
        m: ['typescript', 'rust', 'go'],
        l: ['typescript', 'rust', 'go', 'python'],
      });
      return { values, skillOptions };
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 24px; width: 400px;">
        <CoarTagSelect v-model="values.xs" label="Extra Small" size="xs" :options="skillOptions" />
        <CoarTagSelect v-model="values.s" label="Small" size="s" :options="skillOptions" />
        <CoarTagSelect v-model="values.m" label="Medium" size="m" :options="skillOptions" />
        <CoarTagSelect v-model="values.l" label="Large" size="l" :options="skillOptions" />
      </div>
    `,
  }),
};
