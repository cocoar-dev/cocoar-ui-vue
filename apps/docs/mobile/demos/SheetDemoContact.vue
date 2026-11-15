<script setup lang="ts">
// Body of the "Edit contact" sheet of SheetDemo.vue: more fields than a phone screen holds, so
// they scroll inside the sheet while Save and Cancel stay in its fixed footer (CoarDialogFooter).
import { ref } from 'vue';
import { CoarButton, CoarDialogFooter, CoarFormField, CoarTextInput } from '@cocoar/vue-ui';

export interface Contact {
  name: string;
  email: string;
  phone: string;
  company: string;
  street: string;
  postcode: string;
  city: string;
  country: string;
  notes: string;
}

const props = defineProps<{
  contact: Contact;
  close: (result?: Contact) => void;
}>();

const draft = ref<Contact>({ ...props.contact });

const fields: { key: keyof Contact; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'E-mail' },
  { key: 'phone', label: 'Phone' },
  { key: 'company', label: 'Company' },
  { key: 'street', label: 'Street' },
  { key: 'postcode', label: 'Postcode' },
  { key: 'city', label: 'City' },
  { key: 'country', label: 'Country' },
  { key: 'notes', label: 'Notes' },
];
</script>

<template>
  <div class="sheet-demo-contact">
    <CoarFormField v-for="f in fields" :key="f.key" :label="f.label">
      <CoarTextInput v-model="draft[f.key]" />
    </CoarFormField>

    <CoarDialogFooter>
      <CoarButton variant="secondary" @click="props.close()">Cancel</CoarButton>
      <CoarButton @click="props.close({ ...draft })">Save</CoarButton>
    </CoarDialogFooter>
  </div>
</template>

<style scoped>
.sheet-demo-contact {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--coar-spacing-l);
}
</style>
