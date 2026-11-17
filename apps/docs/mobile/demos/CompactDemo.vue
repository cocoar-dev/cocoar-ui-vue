<script setup lang="ts">
import { ref } from 'vue';
import { CoarButton, CoarCheckbox, CoarFormField, CoarSelect, CoarTextInput, useDialog } from '@cocoar/vue-ui';
import '@cocoar/vue-ui/fonts/compact';
import SheetDemoContact, { type Contact } from './SheetDemoContact.vue';

const name = ref('Anna Berger');
const status = ref<string | null>('review');
const notify = ref(true);
const message = ref('Synthetic data only.');
const dialog = useDialog();
const contact: Contact = {
  name: 'Anna Berger', email: 'anna@example.com', phone: '+43 1 234 567',
  company: 'Example', street: 'Ringstraße 12', postcode: '1010',
  city: 'Vienna', country: 'Austria', notes: 'Synthetic compact presentation sample.',
};

async function edit() {
  const result = await dialog.open<Contact>(
    SheetDemoContact,
    { title: 'Compact contact', presentation: 'sheet' },
    { contact },
  ).result;
  message.value = result ? `Saved “${result.name}”.` : 'Editing cancelled.';
}
</script>

<template>
  <section class="coar-compact compact-demo">
    <p>Preview: 44 px controls, 14 px actions and separate 16 px input text.</p>
    <CoarFormField label="Name"><CoarTextInput v-model="name" clearable /></CoarFormField>
    <CoarFormField label="Status">
      <CoarSelect v-model="status" :options="[
        { value: 'review', label: 'In Prüfung' },
        { value: 'planned', label: 'Geplant' },
        { value: 'done', label: 'Abgeschlossen' },
      ]" />
    </CoarFormField>
    <CoarCheckbox v-model="notify" label="Benachrichtigungen senden" />
    <CoarButton full-width @click="edit">Edit compact contact</CoarButton>
    <output>{{ message }}</output>
  </section>
</template>

<style scoped>
.compact-demo { display: grid; gap: 12px; padding: 16px; background: var(--coar-background-neutral-primary); }
.compact-demo p { margin: 0; }
.compact-demo output { overflow-wrap: anywhere; color: var(--coar-text-neutral-secondary); }
</style>
