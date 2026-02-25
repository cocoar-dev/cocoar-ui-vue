import type { Meta, StoryObj } from '@storybook/vue3';
import { ref } from 'vue';

import { Temporal } from '@js-temporal/polyfill';

import CoarZonedDateTimePicker from './CoarZonedDateTimePicker.vue';

const meta: Meta<typeof CoarZonedDateTimePicker> = {
  title: 'Date & Time/ZonedDateTimePicker',
  component: CoarZonedDateTimePicker,
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
    timeZone: { control: 'text' },
  },
};
export default meta;
type Story = StoryObj<typeof CoarZonedDateTimePicker>;

export const Playground: Story = {
  render: (args) => ({
    components: { CoarZonedDateTimePicker },
    setup() {
      const dt = ref<Temporal.ZonedDateTime | null>(null);
      return { args, dt };
    },
    template: `
      <div style="max-width: 340px;">
        <CoarZonedDateTimePicker v-bind="args" v-model="dt" />
        <div style="margin-top: 16px; font-size: 13px; color: var(--coar-text-neutral-secondary)">
          <p>Value: {{ dt?.toString() ?? 'null' }}</p>
          <p v-if="dt">Timezone: {{ dt?.timeZoneId }}</p>
          <p v-if="dt">UTC: {{ dt?.toInstant().toString() }}</p>
        </div>
      </div>
    `,
  }),
  args: {
    label: 'Meeting',
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

export const WithTimezone: Story = {
  render: () => ({
    components: { CoarZonedDateTimePicker },
    setup() {
      const dt = ref<Temporal.ZonedDateTime | null>(
        Temporal.ZonedDateTime.from('2025-07-15T14:30[America/New_York]'),
      );
      return { dt };
    },
    template: `
      <div style="max-width: 340px;">
        <CoarZonedDateTimePicker v-model="dt" label="New York Meeting" timeZone="America/New_York" />
        <div style="margin-top: 12px; font-size: 13px; color: var(--coar-text-neutral-secondary)">
          <p>Value: {{ dt?.toString() ?? 'null' }}</p>
          <p v-if="dt">Local: {{ dt?.toPlainDateTime().toString() }}</p>
          <p v-if="dt">TZ: {{ dt?.timeZoneId }}</p>
        </div>
      </div>
    `,
  }),
};

export const FilteredTimezones: Story = {
  render: () => ({
    components: { CoarZonedDateTimePicker },
    setup() {
      const dt = ref<Temporal.ZonedDateTime | null>(null);
      return { dt };
    },
    template: `
      <div style="max-width: 340px;">
        <CoarZonedDateTimePicker
          v-model="dt"
          label="European Event"
          :timezoneFilter="['Europe/*', 'UTC']"
          timeZone="Europe/Vienna"
        />
        <p style="margin-top: 12px; font-size: 13px; color: var(--coar-text-neutral-secondary)">
          Only European timezones shown. Value: {{ dt?.toString() ?? 'null' }}
        </p>
      </div>
    `,
  }),
};

export const DifferentTimezones: Story = {
  render: () => ({
    components: { CoarZonedDateTimePicker },
    setup() {
      const viennaMeeting = ref<Temporal.ZonedDateTime | null>(
        Temporal.ZonedDateTime.from('2025-03-15T09:00[Europe/Vienna]'),
      );
      const nyMeeting = ref<Temporal.ZonedDateTime | null>(
        Temporal.ZonedDateTime.from('2025-03-15T09:00[America/New_York]'),
      );
      const tokyoMeeting = ref<Temporal.ZonedDateTime | null>(
        Temporal.ZonedDateTime.from('2025-03-15T09:00[Asia/Tokyo]'),
      );
      return { viennaMeeting, nyMeeting, tokyoMeeting };
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 24px; max-width: 340px;">
        <div>
          <CoarZonedDateTimePicker v-model="viennaMeeting" label="Vienna Office" />
          <p style="font-size: 11px; color: var(--coar-text-neutral-tertiary); margin-top: 4px;">
            {{ viennaMeeting?.toInstant().toString() }}
          </p>
        </div>
        <div>
          <CoarZonedDateTimePicker v-model="nyMeeting" label="New York Office" />
          <p style="font-size: 11px; color: var(--coar-text-neutral-tertiary); margin-top: 4px;">
            {{ nyMeeting?.toInstant().toString() }}
          </p>
        </div>
        <div>
          <CoarZonedDateTimePicker v-model="tokyoMeeting" label="Tokyo Office" />
          <p style="font-size: 11px; color: var(--coar-text-neutral-tertiary); margin-top: 4px;">
            {{ tokyoMeeting?.toInstant().toString() }}
          </p>
        </div>
      </div>
    `,
  }),
};

export const States: Story = {
  render: () => ({
    components: { CoarZonedDateTimePicker },
    setup() {
      const dt = ref(Temporal.ZonedDateTime.from('2025-01-01T09:00[Europe/Vienna]'));
      return { dt };
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 16px; max-width: 340px;">
        <CoarZonedDateTimePicker v-model="dt" label="Disabled" disabled />
        <CoarZonedDateTimePicker v-model="dt" label="Readonly" readonly />
        <CoarZonedDateTimePicker v-model="dt" label="Error" error="Timezone conflict detected" />
      </div>
    `,
  }),
};

export const Sizes: Story = {
  render: () => ({
    components: { CoarZonedDateTimePicker },
    setup() {
      const dt = ref(Temporal.ZonedDateTime.from('2025-06-15T14:30[Europe/Vienna]'));
      return { dt };
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 16px; max-width: 340px;">
        <CoarZonedDateTimePicker v-model="dt" label="Extra Small" size="xs" />
        <CoarZonedDateTimePicker v-model="dt" label="Small" size="s" />
        <CoarZonedDateTimePicker v-model="dt" label="Medium" size="m" />
        <CoarZonedDateTimePicker v-model="dt" label="Large" size="l" />
      </div>
    `,
  }),
};
