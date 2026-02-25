import type { Meta, StoryObj } from '@storybook/vue3';
import { ref } from 'vue';

import { Temporal } from '@js-temporal/polyfill';

import CoarPlainDateTimePicker from './CoarPlainDateTimePicker.vue';

const meta: Meta<typeof CoarPlainDateTimePicker> = {
  title: 'Date & Time/PlainDateTimePicker',
  component: CoarPlainDateTimePicker,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['xs', 's', 'm', 'l'] },
    use24Hour: { control: 'select', options: [true, false, 'auto'] },
    minuteStep: { control: 'select', options: [1, 5, 10, 15] },
    clearable: { control: 'boolean' },
    showWeekNumbers: { control: 'boolean' },
    highlightWeekends: { control: 'boolean' },
    disabled: { control: 'boolean' },
    readonly: { control: 'boolean' },
    locale: { control: 'text' },
  },
};
export default meta;
type Story = StoryObj<typeof CoarPlainDateTimePicker>;

export const Playground: Story = {
  render: (args) => ({
    components: { CoarPlainDateTimePicker },
    setup() {
      const dt = ref<Temporal.PlainDateTime | null>(null);
      return { args, dt };
    },
    template: `
      <div style="max-width: 320px;">
        <CoarPlainDateTimePicker v-bind="args" v-model="dt" />
        <p style="margin-top: 16px; font-size: 13px; color: var(--coar-text-neutral-secondary)">
          Value: {{ dt?.toString() ?? 'null' }}
        </p>
      </div>
    `,
  }),
  args: {
    label: 'Appointment',
    size: 'm',
    use24Hour: 'auto',
    minuteStep: 5,
    clearable: true,
    showWeekNumbers: false,
    highlightWeekends: false,
    disabled: false,
    readonly: false,
  },
};

export const TwentyFourHour: Story = {
  render: () => ({
    components: { CoarPlainDateTimePicker },
    setup() {
      const dt = ref<Temporal.PlainDateTime | null>(
        Temporal.PlainDateTime.from('2025-07-15T14:30'),
      );
      return { dt };
    },
    template: `
      <div style="max-width: 320px;">
        <CoarPlainDateTimePicker v-model="dt" label="24-Hour Format" :use24Hour="true" />
        <p style="margin-top: 12px; font-size: 13px; color: var(--coar-text-neutral-secondary)">
          Value: {{ dt?.toString() ?? 'null' }}
        </p>
      </div>
    `,
  }),
};

export const TwelveHour: Story = {
  render: () => ({
    components: { CoarPlainDateTimePicker },
    setup() {
      const dt = ref<Temporal.PlainDateTime | null>(
        Temporal.PlainDateTime.from('2025-07-15T14:30'),
      );
      return { dt };
    },
    template: `
      <div style="max-width: 320px;">
        <CoarPlainDateTimePicker v-model="dt" label="12-Hour Format" :use24Hour="false" />
        <p style="margin-top: 12px; font-size: 13px; color: var(--coar-text-neutral-secondary)">
          Value: {{ dt?.toString() ?? 'null' }}
        </p>
      </div>
    `,
  }),
};

export const MinuteSteps: Story = {
  render: () => ({
    components: { CoarPlainDateTimePicker },
    setup() {
      const dt = ref<Temporal.PlainDateTime | null>(null);
      return { dt };
    },
    template: `
      <div style="max-width: 320px;">
        <CoarPlainDateTimePicker v-model="dt" label="15-minute steps" :minuteStep="15" />
        <p style="margin-top: 12px; font-size: 13px; color: var(--coar-text-neutral-secondary)">
          Value: {{ dt?.toString() ?? 'null' }}
        </p>
      </div>
    `,
  }),
};

export const WithMinMax: Story = {
  render: () => ({
    components: { CoarPlainDateTimePicker },
    setup() {
      const now = Temporal.Now.plainDateTimeISO();
      const min = now;
      const max = now.add({ days: 14 });
      const dt = ref<Temporal.PlainDateTime | null>(null);
      return { dt, min, max };
    },
    template: `
      <div style="max-width: 320px;">
        <CoarPlainDateTimePicker
          v-model="dt"
          label="Constrained"
          :min="min"
          :max="max"
          hint="Next 2 weeks only"
        />
        <p style="margin-top: 12px; font-size: 13px; color: var(--coar-text-neutral-secondary)">
          Value: {{ dt?.toString() ?? 'null' }}
        </p>
      </div>
    `,
  }),
};

export const States: Story = {
  render: () => ({
    components: { CoarPlainDateTimePicker },
    setup() {
      const dt = ref(Temporal.PlainDateTime.from('2025-01-01T09:00'));
      return { dt };
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 16px; max-width: 320px;">
        <CoarPlainDateTimePicker v-model="dt" label="Disabled" disabled />
        <CoarPlainDateTimePicker v-model="dt" label="Readonly" readonly />
        <CoarPlainDateTimePicker v-model="dt" label="Error" error="Conflict with existing appointment" />
      </div>
    `,
  }),
};
