<script setup lang="ts">
/**
 * Mobile form: a realistic form built from today's components, in the mobile presentation
 * (`.coar-mobile` on its own root, so it works without the class on `<html>`). It is the
 * yardstick of the mobile expansion (`.alta/plans/2026-11-14-mobile-library-expansion.md`):
 * what still looks like desktop here is open. `e2e/mobile-form.spec.ts` operates every field
 * by tap and measures tap targets and font sizes.
 */
import { ref } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import {
  CoarButton,
  CoarCheckbox,
  CoarFormField,
  CoarMultiSelect,
  CoarNumberInput,
  CoarPlainDatePicker,
  CoarSegmentedControl,
  CoarSelect,
  CoarSwitch,
  CoarTextInput,
  CoarZonedDateTimePicker,
  useDialog,
} from '@cocoar/vue-ui';

const countries = [
  { value: 'at', label: 'Austria' },
  { value: 'de', label: 'Germany' },
  { value: 'ch', label: 'Switzerland' },
  { value: 'it', label: 'Italy' },
];
const topics = [
  { value: 'design', label: 'Design' },
  { value: 'research', label: 'Research' },
  { value: 'sales', label: 'Sales' },
  { value: 'support', label: 'Support' },
];
const visibilities = [
  { value: 'private', label: 'Private' },
  { value: 'team', label: 'Team' },
  { value: 'public', label: 'Public' },
];
const dateFormat = { pattern: 'dd.mm.yyyy', firstDayOfWeek: 1 } as const;

function initial() {
  return {
    name: 'Workshop Vienna' as string | undefined,
    seats: 12 as number | null,
    country: 'at' as string | null,
    topics: ['design'] as string[],
    startDate: Temporal.PlainDate.from('2026-03-14') as Temporal.PlainDate | null,
    meeting: Temporal.ZonedDateTime.from(
      '2026-03-20T10:00[Europe/Vienna]',
    ) as Temporal.ZonedDateTime | null,
    visibility: 'team',
    notify: false,
    terms: false,
  };
}

const form = ref(initial());
const status = ref('Editing');

function summary() {
  const f = form.value;
  return [
    `name=${f.name ?? ''}`,
    `seats=${f.seats ?? ''}`,
    `country=${f.country ?? ''}`,
    `topics=${f.topics.join(',')}`,
    `start=${f.startDate?.toString() ?? ''}`,
    `meeting=${f.meeting?.toPlainDateTime().toString() ?? ''}`,
    `visibility=${f.visibility}`,
    `notify=${f.notify}`,
    `terms=${f.terms}`,
  ].join('; ');
}

function save() {
  status.value = `Saved: ${summary()}`;
}

function cancel() {
  form.value = initial();
  status.value = 'Cancelled';
}

const dialog = useDialog();
async function remove() {
  status.value = 'Confirming delete';
  const confirmed = await dialog.confirm({
    title: 'Delete the event?',
    message: 'The event is removed for everyone.',
    confirmText: 'Delete',
    cancelText: 'Keep',
    confirmVariant: 'danger',
  }).result;
  status.value = confirmed ? 'Deleted' : 'Kept';
}
</script>

<template>
  <div class="mobile-form coar-mobile" data-testid="mobile-form">
    <h1>Mobile form</h1>
    <p class="mobile-form__intro">Today's components in the mobile presentation.</p>

    <form class="mobile-form__fields" novalidate @submit.prevent="save">
      <CoarFormField label="Name" data-testid="field-name">
        <CoarTextInput v-model="form.name" clearable placeholder="Event name" />
      </CoarFormField>

      <CoarFormField label="Seats" data-testid="field-seats">
        <CoarNumberInput v-model="form.seats" stepper-buttons="both" :min="1" :max="99" />
      </CoarFormField>

      <CoarFormField label="Country" data-testid="field-country">
        <CoarSelect v-model="form.country" :options="countries" placeholder="Choose a country" />
      </CoarFormField>

      <CoarFormField label="Topics" data-testid="field-topics">
        <CoarMultiSelect v-model="form.topics" :options="topics" placeholder="Choose topics" />
      </CoarFormField>

      <CoarFormField label="Start date" data-testid="field-start-date">
        <CoarPlainDatePicker
          v-model="form.startDate"
          close-on-select
          :date-format="dateFormat"
          locale="en-US"
        />
      </CoarFormField>

      <CoarFormField label="Meeting" data-testid="field-meeting">
        <CoarZonedDateTimePicker
          v-model="form.meeting"
          time-zone="Europe/Vienna"
          :date-format="dateFormat"
          locale="en-US"
          :use24-hour="true"
        />
      </CoarFormField>

      <div class="mobile-form__group" data-testid="field-visibility">
        <span class="mobile-form__label">Visibility</span>
        <CoarSegmentedControl
          v-model="form.visibility"
          :options="visibilities"
          aria-label="Visibility"
        />
      </div>

      <div data-testid="field-notify">
        <CoarSwitch v-model="form.notify" label="Notify participants" />
      </div>

      <div data-testid="field-terms">
        <CoarCheckbox v-model="form.terms" label="I accept the terms" />
      </div>

      <div class="mobile-form__actions" data-testid="form-actions">
        <CoarButton type="submit" data-testid="action-save">Save</CoarButton>
        <CoarButton variant="secondary" data-testid="action-cancel" @click="cancel">
          Cancel
        </CoarButton>
        <CoarButton variant="danger" data-testid="action-delete" @click="remove">
          Delete
        </CoarButton>
      </div>
    </form>

    <output class="mobile-form__status" data-testid="form-status">{{ status }}</output>
  </div>
</template>

<style scoped>
.mobile-form {
  max-width: 420px;
  margin: 0 auto;
}

.mobile-form h1 {
  margin: 0 0 var(--coar-spacing-xs);
}

.mobile-form__intro {
  margin: 0 0 var(--coar-spacing-l);
}

.mobile-form__fields {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--coar-spacing-l);
}

.mobile-form__group {
  display: grid;
  gap: var(--coar-spacing-xs);
}

.mobile-form__label {
  font-weight: 600;
}

.mobile-form__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--coar-spacing-m);
}

.mobile-form__status {
  display: block;
  margin-top: var(--coar-spacing-l);
  overflow-wrap: anywhere;
}
</style>
