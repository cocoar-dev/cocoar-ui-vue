<script setup lang="ts">
// Today's form components in the mobile presentation, with a confirm dialog.
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

function initial() {
  return {
    name: 'Workshop Vienna' as string | undefined,
    seats: 12 as number | null,
    country: 'at' as string | null,
    topics: ['design'] as string[],
    startDate: Temporal.PlainDate.from('2026-03-14') as Temporal.PlainDate | null,
    visibility: 'team',
    notify: false,
    terms: false,
  };
}

const form = ref(initial());
const status = ref('Editing');

function save() {
  status.value = `Saved “${form.value.name ?? ''}” for ${form.value.seats ?? 0} seats.`;
}

function cancel() {
  form.value = initial();
  status.value = 'Changes discarded.';
}

const dialog = useDialog();
async function remove() {
  const confirmed = await dialog.confirm({
    title: 'Delete the event?',
    message: 'The event is removed for everyone.',
    confirmText: 'Delete',
    cancelText: 'Keep',
    confirmVariant: 'danger',
  }).result;
  status.value = confirmed ? 'Event deleted.' : 'Event kept.';
}
</script>

<template>
  <form class="form-demo" novalidate @submit.prevent="save">
    <CoarFormField label="Name">
      <CoarTextInput v-model="form.name" clearable placeholder="Event name" />
    </CoarFormField>

    <CoarFormField label="Seats">
      <CoarNumberInput v-model="form.seats" stepper-buttons="both" :min="1" :max="99" />
    </CoarFormField>

    <CoarFormField label="Country">
      <CoarSelect v-model="form.country" :options="countries" placeholder="Choose a country" />
    </CoarFormField>

    <CoarFormField label="Topics">
      <CoarMultiSelect v-model="form.topics" :options="topics" placeholder="Choose topics" />
    </CoarFormField>

    <CoarFormField label="Start date">
      <CoarPlainDatePicker v-model="form.startDate" close-on-select locale="en-US" />
    </CoarFormField>

    <div class="form-demo__group">
      <span class="form-demo__label">Visibility</span>
      <CoarSegmentedControl
        v-model="form.visibility"
        :options="visibilities"
        aria-label="Visibility"
      />
    </div>

    <CoarSwitch v-model="form.notify" label="Notify participants" />
    <CoarCheckbox v-model="form.terms" label="I accept the terms" />

    <div class="form-demo__actions">
      <CoarButton type="submit">Save</CoarButton>
      <CoarButton variant="secondary" @click="cancel">Cancel</CoarButton>
      <CoarButton variant="danger" @click="remove">Delete</CoarButton>
    </div>

    <output class="form-demo__status">{{ status }}</output>
  </form>
</template>

<style scoped>
.form-demo {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--coar-spacing-l);
}

.form-demo__group {
  display: grid;
  gap: var(--coar-spacing-xs);
}

.form-demo__label {
  font-weight: 600;
}

.form-demo__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--coar-spacing-m);
}

.form-demo__status {
  color: var(--coar-text-neutral-secondary);
  overflow-wrap: anywhere;
}
</style>
