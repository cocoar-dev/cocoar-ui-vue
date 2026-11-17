<script setup lang="ts">
import './compact-fonts';
/**
 * Compact profile on a phone (`.coar-compact` + `.coar-mobile`, 390×844): a long form as a
 * bottom sheet (`CoarSheetShell`). The body scrolls; Save and Cancel stay in the fixed footer.
 * Mobile presentation only.
 */
import { defineComponent, h, onMounted } from 'vue';
import {
  CoarButton,
  CoarCheckbox,
  CoarDialogFooter,
  CoarFormField,
  CoarNumberInput,
  CoarSelect,
  CoarTextInput,
  useDialog,
} from '@cocoar/vue-ui';
import { cityOptions } from './compact-interaction-data';

const dialog = useDialog();

const fields: [label: string, value: string][] = [
  ['Veranstalter', 'Ada Lovelace'],
  ['E-Mail', 'ada@example.com'],
  ['Telefon', '+43 1 234 567'],
  ['Straße', 'Ringstraße 12'],
  ['Postleitzahl', '1010'],
  ['Raum', 'Saal B'],
  ['Verpflegung', 'Vegetarisch'],
  ['Notiz', 'Bühne links'],
];

const LongForm = defineComponent({
  setup() {
    return () =>
      h('div', { style: 'display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px' }, [
        h(CoarFormField, { label: 'Ort', required: true }, () => h(CoarSelect, { modelValue: 'vie', options: cityOptions })),
        h(CoarFormField, { label: 'Teilnehmende' }, () => h(CoarNumberInput, { modelValue: 24, stepperButtons: 'both' })),
        ...fields.map(([label, value]) => h(CoarFormField, { label }, () => h(CoarTextInput, { modelValue: value }))),
        h(CoarCheckbox, { modelValue: true, label: 'Bestätigung per E-Mail senden' }),
        h(CoarDialogFooter, null, () => [
          h(CoarButton, { variant: 'secondary' }, () => 'Abbrechen'),
          h(CoarButton, null, () => 'Speichern'),
        ]),
      ]);
  },
});

onMounted(() => {
  dialog.open(LongForm, { title: 'Details bearbeiten', presentation: 'sheet' });
});
</script>

<template>
  <div class="coar-compact" data-interaction="sheet">
    <section class="vs-section">
      <h2 class="vs-title">Long form sheet over the page</h2>
      <p style="margin: 0">Seiteninhalt hinter dem Hintergrund.</p>
    </section>
  </div>
</template>
