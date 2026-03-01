import type { Meta, StoryObj } from '@storybook/vue3';
import { ref } from 'vue';

import { Temporal } from '@js-temporal/polyfill';

import CoarScrollableCalendar from './CoarScrollableCalendar.vue';

const meta: Meta<typeof CoarScrollableCalendar> = {
  title: 'Date & Time/ScrollableCalendar',
  component: CoarScrollableCalendar,
  tags: ['autodocs'],
  argTypes: {
    showWeekNumbers: { control: 'boolean' },
    highlightWeekends: { control: 'boolean' },
    locale: { control: 'text' },
  },
};
export default meta;
type Story = StoryObj<typeof CoarScrollableCalendar>;

export const Playground: Story = {
  render: (args) => ({
    components: { CoarScrollableCalendar },
    setup() {
      const selected = ref<Temporal.PlainDate | null>(null);
      const activeMonth = ref(Temporal.Now.plainDateISO().toPlainYearMonth());
      return { args, selected, activeMonth };
    },
    template: `
      <div style="height: 400px; width: 320px; border: 1px solid var(--coar-border-neutral-tertiary); border-radius: 8px; overflow: hidden;">
        <CoarScrollableCalendar
          v-bind="args"
          v-model="selected"
          v-model:activeMonth="activeMonth"
        />
      </div>
      <p style="margin-top: 12px; font-size: 13px; color: var(--coar-text-neutral-secondary)">
        Selected: {{ selected?.toString() ?? 'none' }} · Active month: {{ activeMonth?.toString() }}
      </p>
    `,
  }),
};

export const WithWeekNumbers: Story = {
  render: () => ({
    components: { CoarScrollableCalendar },
    setup() {
      const selected = ref<Temporal.PlainDate | null>(Temporal.PlainDate.from('2025-07-15'));
      const activeMonth = ref(Temporal.PlainYearMonth.from({ year: 2025, month: 7 }));
      return { selected, activeMonth };
    },
    template: `
      <div style="height: 400px; width: 360px; border: 1px solid var(--coar-border-neutral-tertiary); border-radius: 8px; overflow: hidden;">
        <CoarScrollableCalendar
          v-model="selected"
          v-model:activeMonth="activeMonth"
          :showWeekNumbers="true"
        />
      </div>
    `,
  }),
};

export const HighlightWeekends: Story = {
  render: () => ({
    components: { CoarScrollableCalendar },
    setup() {
      const selected = ref<Temporal.PlainDate | null>(null);
      const activeMonth = ref(Temporal.Now.plainDateISO().toPlainYearMonth());
      return { selected, activeMonth };
    },
    template: `
      <div style="height: 400px; width: 320px; border: 1px solid var(--coar-border-neutral-tertiary); border-radius: 8px; overflow: hidden;">
        <CoarScrollableCalendar
          v-model="selected"
          v-model:activeMonth="activeMonth"
          :highlightWeekends="true"
        />
      </div>
    `,
  }),
};

export const WithMarkers: Story = {
  render: () => ({
    components: { CoarScrollableCalendar },
    setup() {
      const today = Temporal.Now.plainDateISO();
      const selected = ref<Temporal.PlainDate | null>(null);
      const activeMonth = ref(today.toPlainYearMonth());
      const markers = [
        { date: today.add({ days: 1 }), label: 'Meeting', color: 'var(--coar-background-accent-bold)' },
        { date: today.add({ days: 3 }), label: 'Deadline', color: 'var(--coar-background-danger-bold)' },
        { date: today.add({ days: 7 }), label: 'Holiday', color: 'var(--coar-background-success-bold)' },
        { date: today.add({ days: 10 }), label: 'Event', color: 'var(--coar-background-warning-bold)' },
      ];
      return { selected, activeMonth, markers };
    },
    template: `
      <div style="height: 400px; width: 320px; border: 1px solid var(--coar-border-neutral-tertiary); border-radius: 8px; overflow: hidden;">
        <CoarScrollableCalendar
          v-model="selected"
          v-model:activeMonth="activeMonth"
          :markers="markers"
        />
      </div>
    `,
  }),
};

export const MinMax: Story = {
  render: () => ({
    components: { CoarScrollableCalendar },
    setup() {
      const today = Temporal.Now.plainDateISO();
      const min = today.subtract({ days: 7 });
      const max = today.add({ days: 30 });
      const selected = ref<Temporal.PlainDate | null>(null);
      const activeMonth = ref(today.toPlainYearMonth());
      return { selected, activeMonth, min, max };
    },
    template: `
      <div style="height: 400px; width: 320px; border: 1px solid var(--coar-border-neutral-tertiary); border-radius: 8px; overflow: hidden;">
        <CoarScrollableCalendar
          v-model="selected"
          v-model:activeMonth="activeMonth"
          :min="min"
          :max="max"
        />
      </div>
      <p style="margin-top: 8px; font-size: 13px; color: var(--coar-text-neutral-secondary)">
        Only dates from {{ min.toString() }} to {{ max.toString() }} are selectable.
      </p>
    `,
  }),
};

export const GermanLocale: Story = {
  render: () => ({
    components: { CoarScrollableCalendar },
    setup() {
      const selected = ref<Temporal.PlainDate | null>(null);
      const activeMonth = ref(Temporal.Now.plainDateISO().toPlainYearMonth());
      return { selected, activeMonth };
    },
    template: `
      <div style="height: 400px; width: 320px; border: 1px solid var(--coar-border-neutral-tertiary); border-radius: 8px; overflow: hidden;">
        <CoarScrollableCalendar
          v-model="selected"
          v-model:activeMonth="activeMonth"
          locale="de-DE"
        />
      </div>
    `,
  }),
};
