<script setup lang="ts">
// Dialogs as bottom sheets: a confirmation, and a form longer than the screen whose buttons
// stay in the sheet's fixed footer.
import { ref } from 'vue';
import { CoarButton, useDialog } from '@cocoar/vue-ui';
import SheetDemoContact, { type Contact } from './SheetDemoContact.vue';

const dialog = useDialog();
const contact = ref<Contact>({
  name: 'Anna Berger',
  email: 'anna@example.com',
  phone: '+43 1 234 567',
  company: 'Berger & Partner',
  street: 'Ringstraße 12',
  postcode: '1010',
  city: 'Vienna',
  country: 'Austria',
  notes: 'Prefers a call in the morning',
});
const status = ref('Nothing opened yet.');

async function remove() {
  const confirmed = await dialog.confirm({
    title: 'Delete the contact?',
    message: 'The contact is removed for everyone. This cannot be undone.',
    confirmText: 'Delete',
    cancelText: 'Keep',
    confirmVariant: 'danger',
    presentation: 'sheet',
  }).result;
  status.value = confirmed ? 'Contact deleted.' : 'Contact kept.';
}

async function edit() {
  const saved = await dialog.open<Contact>(
    SheetDemoContact,
    { title: 'Edit contact', presentation: 'sheet' },
    { contact: contact.value },
  ).result;
  if (saved) contact.value = saved;
  status.value = saved ? `Saved “${saved.name}”.` : 'Editing cancelled.';
}
</script>

<template>
  <div class="sheet-demo">
    <p class="sheet-demo__hint">
      Edit the contact and focus Phone or Notes: the field and footer stay above the keyboard.
      Drag the handle down, tap the backdrop, or use the buttons to close.
    </p>
    <CoarButton full-width @click="edit">Edit contact</CoarButton>
    <CoarButton variant="danger" full-width @click="remove">Delete contact</CoarButton>
    <output class="sheet-demo__status">{{ status }}</output>
  </div>
</template>

<style scoped>
.sheet-demo {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--coar-spacing-l);
}

.sheet-demo__hint {
  margin: 0;
}

.sheet-demo__status {
  color: var(--coar-text-neutral-secondary);
  overflow-wrap: anywhere;
}
</style>
