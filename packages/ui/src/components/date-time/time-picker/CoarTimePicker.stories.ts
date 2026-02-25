import type { Meta, StoryObj } from '@storybook/vue3';
import { ref } from 'vue';

import CoarTimePicker from './CoarTimePicker.vue';

const meta: Meta<typeof CoarTimePicker> = {
  title: 'Date & Time/TimePicker',
  component: CoarTimePicker,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['xs', 's', 'm', 'l'] },
    use24Hour: { control: 'select', options: [true, false, 'auto'] },
    minuteStep: { control: 'select', options: [1, 5, 10, 15] },
  },
};
export default meta;
type Story = StoryObj<typeof CoarTimePicker>;

export const Playground: Story = {
  render: (args) => ({
    components: { CoarTimePicker },
    setup() {
      const time = ref({ hours: 9, minutes: 30 });
      return { args, time };
    },
    template: `
      <div>
        <CoarTimePicker v-bind="args" v-model="time" />
        <p style="margin-top: 16px; font-size: 14px; color: var(--coar-text-neutral-secondary)">
          Value: {{ time ? time.hours.toString().padStart(2, '0') + ':' + time.minutes.toString().padStart(2, '0') : 'null' }}
        </p>
      </div>
    `,
  }),
  args: {
    size: 'm',
    use24Hour: 'auto',
    minuteStep: 5,
    disabled: false,
    readonly: false,
  },
};

export const TwentyFourHour: Story = {
  render: () => ({
    components: { CoarTimePicker },
    setup() {
      const time = ref({ hours: 14, minutes: 30 });
      return { time };
    },
    template: `
      <div>
        <CoarTimePicker v-model="time" :use24Hour="true" />
        <p style="margin-top: 12px; font-size: 13px; color: var(--coar-text-neutral-secondary)">
          24-hour format — Value: {{ time.hours.toString().padStart(2, '0') }}:{{ time.minutes.toString().padStart(2, '0') }}
        </p>
      </div>
    `,
  }),
};

export const TwelveHour: Story = {
  render: () => ({
    components: { CoarTimePicker },
    setup() {
      const time = ref({ hours: 14, minutes: 30 });
      return { time };
    },
    template: `
      <div>
        <CoarTimePicker v-model="time" :use24Hour="false" />
        <p style="margin-top: 12px; font-size: 13px; color: var(--coar-text-neutral-secondary)">
          12-hour format with AM/PM — Value (24h internal): {{ time.hours.toString().padStart(2, '0') }}:{{ time.minutes.toString().padStart(2, '0') }}
        </p>
      </div>
    `,
  }),
};

export const MinuteSteps: Story = {
  render: () => ({
    components: { CoarTimePicker },
    setup() {
      const t1 = ref({ hours: 9, minutes: 0 });
      const t5 = ref({ hours: 9, minutes: 0 });
      const t10 = ref({ hours: 9, minutes: 0 });
      const t15 = ref({ hours: 9, minutes: 0 });
      return { t1, t5, t10, t15 };
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 20px;">
        <div>
          <label style="font-size: 13px; font-weight: 600; margin-bottom: 8px; display: block;">Step: 1 minute</label>
          <CoarTimePicker v-model="t1" :use24Hour="true" :minuteStep="1" />
        </div>
        <div>
          <label style="font-size: 13px; font-weight: 600; margin-bottom: 8px; display: block;">Step: 5 minutes (default)</label>
          <CoarTimePicker v-model="t5" :use24Hour="true" :minuteStep="5" />
        </div>
        <div>
          <label style="font-size: 13px; font-weight: 600; margin-bottom: 8px; display: block;">Step: 10 minutes</label>
          <CoarTimePicker v-model="t10" :use24Hour="true" :minuteStep="10" />
        </div>
        <div>
          <label style="font-size: 13px; font-weight: 600; margin-bottom: 8px; display: block;">Step: 15 minutes</label>
          <CoarTimePicker v-model="t15" :use24Hour="true" :minuteStep="15" />
        </div>
      </div>
    `,
  }),
};

export const Sizes: Story = {
  render: () => ({
    components: { CoarTimePicker },
    setup() {
      const time = ref({ hours: 10, minutes: 30 });
      return { time };
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 20px;">
        <div>
          <label style="font-size: 13px; font-weight: 600; margin-bottom: 8px; display: block;">XS</label>
          <CoarTimePicker v-model="time" size="xs" :use24Hour="true" />
        </div>
        <div>
          <label style="font-size: 13px; font-weight: 600; margin-bottom: 8px; display: block;">S</label>
          <CoarTimePicker v-model="time" size="s" :use24Hour="true" />
        </div>
        <div>
          <label style="font-size: 13px; font-weight: 600; margin-bottom: 8px; display: block;">M (default)</label>
          <CoarTimePicker v-model="time" size="m" :use24Hour="true" />
        </div>
        <div>
          <label style="font-size: 13px; font-weight: 600; margin-bottom: 8px; display: block;">L</label>
          <CoarTimePicker v-model="time" size="l" :use24Hour="true" />
        </div>
      </div>
    `,
  }),
};

export const MinMax: Story = {
  render: () => ({
    components: { CoarTimePicker },
    setup() {
      const time = ref({ hours: 10, minutes: 0 });
      return { time };
    },
    template: `
      <div>
        <CoarTimePicker
          v-model="time"
          :use24Hour="true"
          :minTime="{ hours: 8, minutes: 0 }"
          :maxTime="{ hours: 17, minutes: 0 }"
        />
        <p style="margin-top: 12px; font-size: 13px; color: var(--coar-text-neutral-secondary)">
          Constrained to 08:00–17:00. Buttons disable at boundaries.
        </p>
      </div>
    `,
  }),
};

export const Disabled: Story = {
  render: () => ({
    components: { CoarTimePicker },
    setup() {
      const time = ref({ hours: 14, minutes: 30 });
      return { time };
    },
    template: `
      <div style="display: flex; gap: 32px;">
        <div>
          <label style="font-size: 13px; font-weight: 600; margin-bottom: 8px; display: block;">Disabled</label>
          <CoarTimePicker v-model="time" :use24Hour="true" disabled />
        </div>
        <div>
          <label style="font-size: 13px; font-weight: 600; margin-bottom: 8px; display: block;">Readonly</label>
          <CoarTimePicker v-model="time" :use24Hour="true" readonly />
        </div>
      </div>
    `,
  }),
};
