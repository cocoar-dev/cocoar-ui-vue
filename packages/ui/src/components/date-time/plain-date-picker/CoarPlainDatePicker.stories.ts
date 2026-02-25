import type { Meta, StoryObj } from '@storybook/vue3';
import { ref } from 'vue';

import { Temporal } from '@js-temporal/polyfill';

import CoarPlainDatePicker from './CoarPlainDatePicker.vue';

const meta: Meta<typeof CoarPlainDatePicker> = {
  title: 'Date & Time/PlainDatePicker',
  component: CoarPlainDatePicker,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['xs', 's', 'm', 'l'] },
    clearable: { control: 'boolean' },
    closeOnSelect: { control: 'boolean' },
    showWeekNumbers: { control: 'boolean' },
    highlightWeekends: { control: 'boolean' },
    showTodayMonthButton: { control: 'boolean' },
    disabled: { control: 'boolean' },
    readonly: { control: 'boolean' },
    required: { control: 'boolean' },
    locale: { control: 'text' },
  },
};
export default meta;
type Story = StoryObj<typeof CoarPlainDatePicker>;

export const Playground: Story = {
  render: (args) => ({
    components: { CoarPlainDatePicker },
    setup() {
      const date = ref<Temporal.PlainDate | null>(null);
      return { args, date };
    },
    template: `
      <div style="max-width: 280px;">
        <CoarPlainDatePicker v-bind="args" v-model="date" />
        <p style="margin-top: 16px; font-size: 13px; color: var(--coar-text-neutral-secondary)">
          Value: {{ date?.toString() ?? 'null' }}
        </p>
      </div>
    `,
  }),
  args: {
    label: 'Select Date',
    placeholder: '',
    size: 'm',
    clearable: true,
    closeOnSelect: false,
    showWeekNumbers: false,
    highlightWeekends: false,
    showTodayMonthButton: true,
    disabled: false,
    readonly: false,
    required: false,
  },
};

export const WithLabel: Story = {
  render: () => ({
    components: { CoarPlainDatePicker },
    setup() {
      const date = ref<Temporal.PlainDate | null>(Temporal.PlainDate.from('2025-07-15'));
      return { date };
    },
    template: `
      <div style="max-width: 280px;">
        <CoarPlainDatePicker v-model="date" label="Date of Birth" required />
        <p style="margin-top: 12px; font-size: 13px; color: var(--coar-text-neutral-secondary)">
          Value: {{ date?.toString() ?? 'null' }}
        </p>
      </div>
    `,
  }),
};

export const WithMinMax: Story = {
  render: () => ({
    components: { CoarPlainDatePicker },
    setup() {
      const today = Temporal.Now.plainDateISO();
      const min = today.subtract({ days: 7 });
      const max = today.add({ days: 30 });
      const date = ref<Temporal.PlainDate | null>(null);
      return { date, min, max };
    },
    template: `
      <div style="max-width: 280px;">
        <CoarPlainDatePicker
          v-model="date"
          label="Appointment Date"
          :min="min"
          :max="max"
          hint="Select a date within the next 30 days"
        />
        <p style="margin-top: 12px; font-size: 13px; color: var(--coar-text-neutral-secondary)">
          Value: {{ date?.toString() ?? 'null' }}
        </p>
      </div>
    `,
  }),
};

export const WithMarkers: Story = {
  render: () => ({
    components: { CoarPlainDatePicker },
    setup() {
      const today = Temporal.Now.plainDateISO();
      const date = ref<Temporal.PlainDate | null>(null);
      const markers = [
        { startDate: today.add({ days: 1 }), description: 'Team standup' },
        { startDate: today.add({ days: 3 }), description: 'Sprint review' },
        { startDate: today.add({ days: 5 }), endDate: today.add({ days: 7 }), description: 'Conference' },
        { startDate: today.add({ days: 10 }), description: 'Deadline' },
      ];
      return { date, markers };
    },
    template: `
      <div style="max-width: 280px;">
        <CoarPlainDatePicker v-model="date" label="Event Date" :markers="markers" />
        <p style="margin-top: 12px; font-size: 13px; color: var(--coar-text-neutral-secondary)">
          Value: {{ date?.toString() ?? 'null' }}
        </p>
      </div>
    `,
  }),
};

export const WeekNumbers: Story = {
  render: () => ({
    components: { CoarPlainDatePicker },
    setup() {
      const date = ref<Temporal.PlainDate | null>(null);
      return { date };
    },
    template: `
      <div style="max-width: 280px;">
        <CoarPlainDatePicker v-model="date" label="With Week Numbers" :showWeekNumbers="true" :highlightWeekends="true" />
      </div>
    `,
  }),
};

export const Sizes: Story = {
  render: () => ({
    components: { CoarPlainDatePicker },
    setup() {
      const xs = ref<Temporal.PlainDate | null>(null);
      const s = ref<Temporal.PlainDate | null>(null);
      const m = ref<Temporal.PlainDate | null>(null);
      const l = ref<Temporal.PlainDate | null>(null);
      return { xs, s, m, l };
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 16px; max-width: 280px;">
        <CoarPlainDatePicker v-model="xs" label="Extra Small" size="xs" />
        <CoarPlainDatePicker v-model="s" label="Small" size="s" />
        <CoarPlainDatePicker v-model="m" label="Medium (default)" size="m" />
        <CoarPlainDatePicker v-model="l" label="Large" size="l" />
      </div>
    `,
  }),
};

export const States: Story = {
  render: () => ({
    components: { CoarPlainDatePicker },
    setup() {
      const date = ref<Temporal.PlainDate | null>(Temporal.PlainDate.from('2025-01-01'));
      return { date };
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 16px; max-width: 280px;">
        <CoarPlainDatePicker v-model="date" label="Disabled" disabled />
        <CoarPlainDatePicker v-model="date" label="Readonly" readonly />
        <CoarPlainDatePicker v-model="date" label="Error" error="This date is not available" />
        <CoarPlainDatePicker v-model="date" label="With Hint" hint="Format: DD.MM.YYYY" />
      </div>
    `,
  }),
};

export const GermanLocale: Story = {
  render: () => ({
    components: { CoarPlainDatePicker },
    setup() {
      const date = ref<Temporal.PlainDate | null>(null);
      return { date };
    },
    template: `
      <div style="max-width: 280px;">
        <CoarPlainDatePicker v-model="date" label="Datum" locale="de-DE" />
        <p style="margin-top: 12px; font-size: 13px; color: var(--coar-text-neutral-secondary)">
          Value: {{ date?.toString() ?? 'null' }}
        </p>
      </div>
    `,
  }),
};
