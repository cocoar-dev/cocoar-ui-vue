<script setup lang="ts">
// A form as a bottom sheet on a phone (390×844): more fields than the sheet holds, so its body scrolls
// while Save and Cancel stay in the fixed footer (`CoarDialogFooter`). Mobile presentation only.
import { defineComponent, h, onMounted } from 'vue';
import {
  CoarButton,
  CoarDialogFooter,
  CoarFormField,
  CoarTextInput,
  useDialog,
} from '@cocoar/vue-ui';

const dialog = useDialog();

const fields: [label: string, value: string][] = [
  ['Organizer', 'Ada Lovelace'],
  ['E-mail', 'ada@example.com'],
  ['Phone', '+43 1 234 567'],
  ['Venue', 'Congress Center'],
  ['Street', 'Ringstraße 12'],
  ['Postcode', '1010'],
  ['City', 'Vienna'],
  ['Room', 'Hall B'],
  ['Catering', 'Vegetarian'],
  ['Notes', 'Stage on the left'],
];

const DetailsForm = defineComponent({
  setup() {
    return () =>
      h('div', { style: 'display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px' }, [
        ...fields.map(([label, value]) =>
          h(CoarFormField, { label }, () => h(CoarTextInput, { modelValue: value })),
        ),
        h(CoarDialogFooter, null, () => [
          h(CoarButton, { variant: 'secondary' }, () => 'Cancel'),
          h(CoarButton, null, () => 'Save'),
        ]),
      ]);
  },
});

// Opened on mount: no pointer, no key press.
onMounted(() => {
  dialog.open(DetailsForm, { title: 'Edit details', presentation: 'sheet' });
});
</script>

<template>
  <section class="vs-section">
    <h2 class="vs-title">Form sheet over the page</h2>
    <p style="margin: 0">Page content behind the backdrop.</p>
  </section>
</template>
