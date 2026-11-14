<script setup lang="ts">
/**
 * Body of the "Edit details" sheet of `MobileFormView.vue`: more fields than a phone screen
 * holds, so the content scrolls inside the sheet; Save and Cancel stand in its fixed footer
 * (`CoarDialogFooter`). Resolves the edited details on Save, nothing on Cancel.
 */
import { ref } from 'vue';
import { CoarButton, CoarDialogFooter, CoarFormField, CoarTextInput } from '@cocoar/vue-ui';

export interface EventDetails {
  organizer: string;
  email: string;
  phone: string;
  venue: string;
  street: string;
  postcode: string;
  city: string;
  room: string;
  catering: string;
  notes: string;
}

const props = defineProps<{
  details: EventDetails;
  close: (result?: EventDetails) => void;
}>();

const draft = ref<EventDetails>({ ...props.details });

const fields: { key: keyof EventDetails; label: string }[] = [
  { key: 'organizer', label: 'Organizer' },
  { key: 'email', label: 'E-mail' },
  { key: 'phone', label: 'Phone' },
  { key: 'venue', label: 'Venue' },
  { key: 'street', label: 'Street' },
  { key: 'postcode', label: 'Postcode' },
  { key: 'city', label: 'City' },
  { key: 'room', label: 'Room' },
  { key: 'catering', label: 'Catering' },
  { key: 'notes', label: 'Notes' },
];
</script>

<template>
  <div class="details-sheet" data-testid="details-form">
    <CoarFormField
      v-for="f in fields"
      :key="f.key"
      :label="f.label"
      :data-testid="`details-${f.key}`"
    >
      <CoarTextInput v-model="draft[f.key]" />
    </CoarFormField>

    <CoarDialogFooter>
      <CoarButton variant="secondary" data-testid="details-cancel" @click="props.close()">
        Cancel
      </CoarButton>
      <CoarButton data-testid="details-save" @click="props.close({ ...draft })">Save</CoarButton>
    </CoarDialogFooter>
  </div>
</template>

<style scoped>
.details-sheet {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--coar-spacing-l);
}
</style>
