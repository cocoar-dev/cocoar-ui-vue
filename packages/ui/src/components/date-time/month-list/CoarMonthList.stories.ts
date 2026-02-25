import type { Meta, StoryObj } from '@storybook/vue3';
import { ref } from 'vue';

import { Temporal } from '@js-temporal/polyfill';

import CoarMonthList from './CoarMonthList.vue';

const meta: Meta<typeof CoarMonthList> = {
  title: 'Date & Time/MonthList',
  component: CoarMonthList,
  tags: ['autodocs'],
  argTypes: {
    locale: { control: 'text' },
    minYear: { control: 'number' },
    maxYear: { control: 'number' },
  },
};
export default meta;
type Story = StoryObj<typeof CoarMonthList>;

export const Playground: Story = {
  render: (args) => ({
    components: { CoarMonthList },
    setup() {
      const activeMonth = ref(Temporal.Now.plainDateISO().toPlainYearMonth());
      return { args, activeMonth };
    },
    template: `
      <div style="height: 340px; width: 160px; border: 1px solid var(--coar-border-neutral-tertiary); border-radius: 8px; overflow: hidden;">
        <CoarMonthList v-bind="args" v-model:activeMonth="activeMonth" />
      </div>
      <p style="margin-top: 12px; font-size: 13px; color: var(--coar-text-neutral-secondary)">
        Active: {{ activeMonth.toString() }}
      </p>
    `,
  }),
};

export const GermanLocale: Story = {
  render: () => ({
    components: { CoarMonthList },
    setup() {
      const activeMonth = ref(Temporal.PlainYearMonth.from({ year: 2025, month: 3 }));
      return { activeMonth };
    },
    template: `
      <div style="height: 340px; width: 160px; border: 1px solid var(--coar-border-neutral-tertiary); border-radius: 8px; overflow: hidden;">
        <CoarMonthList v-model:activeMonth="activeMonth" locale="de-DE" />
      </div>
    `,
  }),
};

export const BoundedYears: Story = {
  render: () => ({
    components: { CoarMonthList },
    setup() {
      const activeMonth = ref(Temporal.PlainYearMonth.from({ year: 2025, month: 6 }));
      return { activeMonth };
    },
    template: `
      <div style="height: 340px; width: 160px; border: 1px solid var(--coar-border-neutral-tertiary); border-radius: 8px; overflow: hidden;">
        <CoarMonthList v-model:activeMonth="activeMonth" :minYear="2020" :maxYear="2030" />
      </div>
      <p style="margin-top: 8px; font-size: 13px; color: var(--coar-text-neutral-secondary)">
        Constrained to 2020–2030
      </p>
    `,
  }),
};

export const SideBySide: Story = {
  name: 'Calendar + MonthList',
  render: () => ({
    components: { CoarMonthList },
    setup() {
      const activeMonth = ref(Temporal.Now.plainDateISO().toPlainYearMonth());
      return { activeMonth };
    },
    template: `
      <p style="margin-bottom: 8px; font-size: 13px; color: var(--coar-text-neutral-secondary)">
        This component is typically used alongside the ScrollableCalendar to form the date picker panel.
      </p>
      <div style="height: 340px; width: 160px; border: 1px solid var(--coar-border-neutral-tertiary); border-radius: 8px; overflow: hidden;">
        <CoarMonthList v-model:activeMonth="activeMonth" />
      </div>
    `,
  }),
};
