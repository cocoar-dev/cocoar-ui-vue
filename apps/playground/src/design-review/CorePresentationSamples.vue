<script setup lang="ts">
import { ref, useId } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import {
  CoarButton, CoarCheckbox, CoarCheckboxGroup, CoarFormField, CoarMultiSelect,
  CoarNumberInput, CoarOtpInput, CoarPasswordInput, CoarPlainDatePicker,
  CoarPlainDateTimeOrDatePicker, CoarPlainDateTimePicker, CoarPlainDateTimeView,
  CoarPlainDateView, CoarRadioButton, CoarRadioGroup, CoarScrollableCalendar,
  CoarSelect, CoarSwitch, CoarTagSelect, CoarTextInput, CoarTimePicker,
  CoarZonedDateTimeOrDatePicker, CoarZonedDateTimePicker, CoarZonedDateTimeView,
  type CoarSelectOption, type CoarTimeValue,
} from '@cocoar/vue-ui';

withDefaults(defineProps<{
  kind?: 'fields' | 'selection' | 'dates' | 'states' | 'typography';
}>(), { kind: 'fields' });

const id = useId();
const sizes = ['xs', 's', 'm', 'l'] as const;
const text = ref('Überweisung an Großhändler');
const password = ref('Synthetic-example-42');
const number = ref<number | null>(1234.5);
const single = ref<string | null>('review');
const multi = ref<string[]>(['review', 'plan']);
const tags = ref<string[]>(['review']);
const checked = ref(true);
const group = ref(['review']);
const radio = ref<unknown>('review');
const otp = ref('123456');
const date = ref(Temporal.PlainDate.from('2026-11-15'));
const dateTime = ref(Temporal.PlainDateTime.from('2026-11-15T14:30'));
const zoned = ref(Temporal.ZonedDateTime.from('2026-11-15T14:30[Europe/Vienna]'));
const time = ref<CoarTimeValue | null>({ hours: 14, minutes: 30 });
const optionalDate = ref<Temporal.PlainDate | Temporal.PlainDateTime | null>(date.value);
const optionalZoned = ref<Temporal.PlainDate | Temporal.ZonedDateTime | null>(date.value);
const options: CoarSelectOption<string>[] = [
  { value: 'review', label: 'In Prüfung' },
  { value: 'plan', label: 'Geplant' },
  { value: 'done', label: 'Abgeschlossen' },
  { value: 'disabled', label: 'Nicht verfügbar', disabled: true },
];
</script>

<template>
  <section class="core-samples" :data-core-kind="kind">
    <template v-if="kind === 'typography'">
      <h2 class="coar-heading">Klare Hierarchie, ohne überall fette Schrift</h2>
      <p>Überweisungen prüfen, Termine abstimmen und Aufgaben abschließen. Diese Oberfläche soll auch mit kleineren Texten ruhig und gut lesbar bleiben.</p>
      <p>I l 1 · O 0 · Straße · Großhändler · ÄÖÜ äöü ß · 0123456789 · 1.234,50 €</p>
      <p class="sample-secondary">Sekundärtext bleibt lesbar, nicht nur optisch dezent.</p>
      <p class="sample-caption">Hilfetext erklärt die Aufgabe, ohne mit der Hauptinformation zu konkurrieren.</p>
      <div class="sample-grid">
        <CoarFormField label="Kleine Texte im echten Feld">
          <CoarTextInput v-model="text" clearable />
        </CoarFormField>
        <CoarFormField label="Ziffern im echten Feld">
          <CoarNumberInput v-model="number" suffix="€" />
        </CoarFormField>
      </div>
      <div class="sample-actions">
        <CoarButton>Änderungen speichern</CoarButton>
        <CoarButton variant="secondary">Abbrechen</CoarButton>
      </div>
    </template>

    <template v-else-if="kind === 'fields'">
      <div v-for="size in sizes" :key="size" class="sample-size-row" :data-size="size">
        <span class="sample-caption">{{ size }}</span>
        <CoarFormField :label="`Text ${size}`">
          <CoarTextInput v-model="text" :size="size" clearable />
        </CoarFormField>
        <CoarButton :size="size">Speichern</CoarButton>
      </div>
      <div class="sample-grid">
        <CoarFormField label="Passwort"><CoarPasswordInput v-model="password" clearable /></CoarFormField>
        <CoarFormField label="Betrag"><CoarNumberInput v-model="number" suffix="€" stepper-buttons="both" clearable /></CoarFormField>
        <CoarFormField label="Mehrzeiliger Text"><CoarTextInput v-model="text" :rows="3" /></CoarFormField>
        <CoarFormField label="Bestätigungscode">
          <CoarOtpInput v-model="otp" />
        </CoarFormField>
      </div>
      <div class="sample-actions">
        <CoarButton>Primär</CoarButton>
        <CoarButton variant="secondary">Sekundär</CoarButton>
        <CoarButton variant="tertiary">Tertiär</CoarButton>
        <CoarButton variant="ghost">Zurück</CoarButton>
        <CoarButton variant="danger">Löschen</CoarButton>
      </div>
    </template>

    <template v-else-if="kind === 'selection'">
      <div v-for="size in sizes" :key="size" class="sample-choice-row" :data-size="size">
        <span class="sample-caption">{{ size }}</span>
        <CoarCheckbox v-model="checked" :size="size" label="Ausgewählt" />
        <CoarSwitch v-model="checked" :size="size" label="Aktiv" />
        <CoarRadioGroup v-model="radio" :name="`${id}-${size}`" :size="size" orientation="horizontal">
          <CoarRadioButton value="review">Prüfen</CoarRadioButton>
          <CoarRadioButton value="plan">Planen</CoarRadioButton>
        </CoarRadioGroup>
      </div>
      <div class="sample-grid">
        <CoarFormField label="Status"><CoarSelect v-model="single" :options="options" clearable /></CoarFormField>
        <CoarFormField label="Mehrfachauswahl"><CoarMultiSelect v-model="multi" :options="options" clearable /></CoarFormField>
        <CoarFormField label="Schlagwörter"><CoarTagSelect v-model="tags" :options="options" allow-create /></CoarFormField>
        <CoarCheckboxGroup v-model="group">
          <CoarCheckbox value="review" label="In Prüfung" />
          <CoarCheckbox value="plan" label="Geplant" />
        </CoarCheckboxGroup>
      </div>
    </template>

    <template v-else-if="kind === 'dates'">
      <div class="sample-grid">
        <CoarFormField label="Datum"><CoarPlainDatePicker v-model="date" locale="de-AT" clearable /></CoarFormField>
        <CoarFormField label="Datum und Uhrzeit"><CoarPlainDateTimePicker v-model="dateTime" locale="de-AT" clearable /></CoarFormField>
        <CoarFormField label="Mit Zeitzone"><CoarZonedDateTimePicker v-model="zoned" locale="de-AT" clearable /></CoarFormField>
        <CoarTimePicker v-model="time" locale="de-AT" aria-label="Uhrzeit" />
        <CoarPlainDateTimeOrDatePicker v-model="optionalDate" locale="de-AT" />
        <CoarZonedDateTimeOrDatePicker v-model="optionalZoned" locale="de-AT" />
        <div class="sample-readonly-dates">
          <CoarPlainDateView :value="date" locale="de-AT" />
          <CoarPlainDateTimeView :value="dateTime" locale="de-AT" />
          <CoarZonedDateTimeView :value="zoned" locale="de-AT" />
        </div>
        <div class="sample-calendar">
          <CoarScrollableCalendar v-model="date" locale="de-AT" />
        </div>
      </div>
    </template>

    <template v-else>
      <div class="sample-grid">
        <CoarFormField label="Normal"><CoarTextInput v-model="text" clearable /></CoarFormField>
        <CoarFormField label="Leer"><CoarTextInput placeholder="Bitte eingeben…" /></CoarFormField>
        <CoarFormField label="Schreibgeschützt"><CoarTextInput v-model="text" readonly /></CoarFormField>
        <CoarFormField label="Deaktiviert"><CoarTextInput v-model="text" disabled /></CoarFormField>
        <CoarFormField label="Fehler" error="Bitte einen gültigen Wert eingeben.">
          <CoarTextInput v-model="text" />
        </CoarFormField>
        <CoarFormField label="Hinweis" hint="Die Informationen sind ausschließlich synthetische Testdaten.">
          <CoarTextInput v-model="text" />
        </CoarFormField>
        <CoarFormField label="Warnung" warning="Eine lange deutsche Warnmeldung muss auch im engen Formular lesbar bleiben.">
          <CoarNumberInput v-model="number" />
        </CoarFormField>
        <CoarFormField label="Prüfliste" :rules="[
          { label: 'Mindestens acht Zeichen', fulfilled: true },
          { label: 'Ein noch offener Prüfschritt', fulfilled: false },
        ]">
          <CoarPasswordInput v-model="password" />
        </CoarFormField>
      </div>
      <div class="sample-actions">
        <CoarButton loading>Wird gespeichert</CoarButton>
        <CoarButton disabled>Deaktiviert</CoarButton>
        <CoarCheckbox :model-value="true" disabled label="Deaktivierte Auswahl" />
        <CoarSwitch :model-value="true" readonly label="Schreibgeschützt" />
      </div>
    </template>
  </section>
</template>

<style scoped>
.core-samples { display: grid; gap: 16px; min-width: 0; }
.core-samples p { margin: 0; }
.sample-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 290px), 1fr)); gap: 16px; }
.sample-size-row { display: grid; grid-template-columns: 24px minmax(0, 1fr) auto; align-items: center; gap: 12px; }
.sample-choice-row { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
.sample-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.sample-caption { color: var(--coar-text-neutral-tertiary); font-size: var(--coar-body-caption-size); line-height: 1.5; }
.sample-secondary { color: var(--coar-text-neutral-secondary); }
.sample-calendar { height: 340px; min-width: 0; }
.sample-readonly-dates { display: grid; align-content: start; gap: 8px; }
</style>
