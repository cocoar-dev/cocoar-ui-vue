import type { Meta, StoryObj } from '@storybook/vue3';
import { ref } from 'vue';
import CoarSelect from './CoarSelect.vue';
import type { CoarSelectOption } from './types';

const fruitOptions: CoarSelectOption[] = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
  { value: 'grape', label: 'Grape' },
  { value: 'mango', label: 'Mango' },
  { value: 'orange', label: 'Orange' },
  { value: 'peach', label: 'Peach' },
  { value: 'pear', label: 'Pear' },
  { value: 'strawberry', label: 'Strawberry' },
  { value: 'watermelon', label: 'Watermelon' },
];

const countryOptions: CoarSelectOption[] = [
  { value: 'at', label: 'Austria', icon: 'globe' },
  { value: 'de', label: 'Germany', icon: 'globe' },
  { value: 'ch', label: 'Switzerland', icon: 'globe' },
  { value: 'it', label: 'Italy', icon: 'globe' },
  { value: 'fr', label: 'France', icon: 'globe' },
  { value: 'es', label: 'Spain', disabled: true },
  { value: 'pt', label: 'Portugal', disabled: true },
];

const meta: Meta<typeof CoarSelect> = {
  title: 'Form Controls/Select',
  component: CoarSelect,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['xs', 's', 'm', 'l'] },
    appearance: { control: 'select', options: ['outline', 'inline'] },
  },
};

export default meta;
type Story = StoryObj<typeof CoarSelect>;

export const Playground: Story = {
  args: {
    label: 'Favorite Fruit',
    placeholder: 'Select a fruit...',
    options: fruitOptions,
    size: 'm',
    searchable: true,
    clearable: true,
    hint: 'Choose your favorite',
  },
  render: (args) => ({
    components: { CoarSelect },
    setup() {
      const value = ref(null);
      return { args, value };
    },
    template: `
      <div style="width: 320px;">
        <CoarSelect v-bind="args" v-model="value" />
        <p style="margin-top: 16px; font-size: 13px; color: var(--coar-text-neutral-secondary);">
          Selected: <strong>{{ value ?? 'none' }}</strong>
        </p>
      </div>
    `,
  }),
};

export const Sizes: Story = {
  render: () => ({
    components: { CoarSelect },
    setup() {
      const values = ref<Record<string, unknown>>({});
      return { values, fruitOptions };
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 24px; width: 320px;">
        <CoarSelect v-model="values.xs" label="Extra Small" size="xs" :options="fruitOptions" placeholder="Select..." />
        <CoarSelect v-model="values.s" label="Small" size="s" :options="fruitOptions" placeholder="Select..." />
        <CoarSelect v-model="values.m" label="Medium (default)" size="m" :options="fruitOptions" placeholder="Select..." />
        <CoarSelect v-model="values.l" label="Large" size="l" :options="fruitOptions" placeholder="Select..." />
      </div>
    `,
  }),
};

export const States: Story = {
  render: () => ({
    components: { CoarSelect },
    setup() {
      const value = ref('banana');
      return { value, fruitOptions };
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 24px; width: 320px;">
        <CoarSelect v-model="value" label="Normal" :options="fruitOptions" />
        <CoarSelect v-model="value" label="With Hint" :options="fruitOptions" hint="Choose wisely" />
        <CoarSelect v-model="value" label="With Error" :options="fruitOptions" error="This field is required" />
        <CoarSelect v-model="value" label="Disabled" :options="fruitOptions" disabled />
        <CoarSelect v-model="value" label="Readonly" :options="fruitOptions" readonly />
        <CoarSelect v-model="value" label="Required" :options="fruitOptions" required />
        <CoarSelect v-model="value" label="Clearable" :options="fruitOptions" clearable />
      </div>
    `,
  }),
};

export const InlineAppearance: Story = {
  render: () => ({
    components: { CoarSelect },
    setup() {
      const value = ref(null);
      return { value, fruitOptions };
    },
    template: `
      <div style="width: 320px;">
        <CoarSelect v-model="value" label="Inline Select" appearance="inline" :options="fruitOptions" placeholder="Select..." />
      </div>
    `,
  }),
};

export const WithDisabledOptions: Story = {
  render: () => ({
    components: { CoarSelect },
    setup() {
      const value = ref(null);
      return { value, countryOptions };
    },
    template: `
      <div style="width: 320px;">
        <CoarSelect v-model="value" label="Country" :options="countryOptions" placeholder="Select a country..." searchable />
        <p style="margin-top: 16px; font-size: 13px; color: var(--coar-text-neutral-secondary);">
          Spain and Portugal are disabled.
        </p>
      </div>
    `,
  }),
};
