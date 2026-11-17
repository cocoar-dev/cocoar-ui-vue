<script setup lang="ts">
import './compact-fonts';
/**
 * Compact profile (`.coar-compact`, Preview): a dialog (`CoarDialogShell`) opened on mount
 * by a component inside the profile's container, with a form body and a footer
 * (`CoarDialogFooter`) of three actions. The shell is teleported and takes the profile from
 * the dialog's owner element.
 */
import { defineComponent, h, onMounted } from 'vue';
import {
  CoarButton,
  CoarDialogFooter,
  CoarFormField,
  CoarSelect,
  CoarTextInput,
  useDialog,
} from '@cocoar/vue-ui';
import { cityOptions } from './compact-interaction-data';

const dialog = useDialog();

const EditForm = defineComponent({
  setup() {
    return () =>
      h('div', { style: 'display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 16px' }, [
        h(CoarFormField, { label: 'Titel', required: true }, () => h(CoarTextInput, { modelValue: 'Überprüfung Q3' })),
        h(CoarFormField, { label: 'Standort', hint: 'Wird im Kalender angezeigt.' }, () =>
          h(CoarSelect, { modelValue: 'vie', options: cityOptions })),
        h('div', { style: 'grid-column: 1 / -1' }, [
          h(CoarFormField, { label: 'Notiz', error: 'Höchstens 120 Zeichen.' }, () =>
            h(CoarTextInput, { modelValue: 'Bitte die Unterlagen 0123456789 vorab lesen' })),
        ]),
        h(CoarDialogFooter, null, () => [
          h(CoarButton, { variant: 'ghost', iconStart: 'trash-2' }, () => 'Löschen'),
          h(CoarButton, { variant: 'secondary' }, () => 'Abbrechen'),
          h(CoarButton, null, () => 'Speichern'),
        ]),
      ]);
  },
});

// Opened on mount, as an app opens an editor: no pointer, no key press.
onMounted(() => {
  dialog.open(EditForm, { title: 'Termin bearbeiten', size: 'm' });
});
</script>

<template>
  <div class="coar-compact" data-interaction="dialog">
    <section class="vs-section">
      <h2 class="vs-title">Dialog with a form body and a footer over the page</h2>
      <p style="margin: 0">Seiteninhalt hinter dem Hintergrund.</p>
    </section>
  </div>
</template>
