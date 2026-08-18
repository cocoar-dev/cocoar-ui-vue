<script setup lang="ts">
import { computed, ref } from 'vue';
import { CoarOverlayHost } from '@cocoar/vue-ui';
import { CoarMarkdownEditorGroup, CoarMarkdownToolbar } from '@cocoar/vue-markdown-editor';
import {
  CoarMarkdownForm,
  type MarkdownFormContextInput,
  type MarkdownFormControlDesign,
  type MarkdownFormMode,
  type MarkdownFormReadonlyDecorations,
  type MarkdownFormValidationResult,
  type MarkdownFormValues,
} from '@cocoar/vue-markdown-form';
import type { MarkdownFormMessages } from '@cocoar/vue-markdown-form';

type ScreenMode = 'template' | MarkdownFormMode;

const mode = ref<ScreenMode>('fill');
const controlDesign = ref<MarkdownFormControlDesign>('coar');
const fieldDecorations = ref<MarkdownFormReadonlyDecorations>({
  markdownFrame: true,
  inlineUnderline: true,
});
const showErrors = ref(false);
const validation = ref<MarkdownFormValidationResult>();
const template = ref(`# Gesprächsnotiz

**Full name:** :field{id=personName type=text label="Full name" layout=row width=fill required placeholder="Vor- und Nachname"}

**Datum:** :field{id=meetingDate type=datetime label="Datum" required placeholder="Datum und Uhrzeit" width=14.5rem}  
**Rolle:** :field{id=role type=select options="po:Product Owner|dev:Developer|design:Design" placeholder="Rolle" width=large}  
**Dauer:** :field{id=durationMinutes type=number placeholder="Dauer" width=10rem min=15 max=240 step=15 suffix="Min."}

**Thema:** :field{id=topic type=text label="Thema" layout=stacked width=full required placeholder="Thema des Gesprächs"}

**Freigegeben:** :field{id=approved type=boolean width=small trueLabel="Ja" falseLabel="Nein"}

## Zusammenfassung

:::field{id=summary type=markdown label="Gesprächszusammenfassung" required placeholder="Was wurde besprochen?"}

## Nächste Schritte

:::field{id=actions type=markdown label="Vereinbarte Schritte" placeholder="- [ ] Aufgabe ergänzen …"}
`);

const initialValues: MarkdownFormValues = {
  personName: 'Barbara Winter',
  meetingDate: '2026-08-17T09:00',
  role: 'po',
  durationMinutes: 45,
  topic: 'Markdown als ausfüllbares Dokument',
  approved: false,
  summary: 'Wir haben den **Fill-Modus** als eigene Schicht über normalem Markdown betrachtet.',
  actions: '- [ ] Inline-Felder validieren\n- [ ] Leere Markdown-Slots testen',
};

const values = ref<MarkdownFormValues>({ ...initialValues });
const entries = computed(() => Object.entries(values.value));
const runtimeMode = computed<MarkdownFormMode>(() =>
  mode.value === 'readonly' ? 'readonly' : 'fill',
);
const messages: Partial<MarkdownFormMessages> = {
  required: (field) => `${field.props['label'] || field.id} ist ein Pflichtfeld.`,
  missingId: () => 'Ein Formularfeld hat keine ID.',
  duplicateId: (field) => `Die Feld-ID „${field.id}“ wird mehrfach verwendet.`,
  unknownType: (field) => `Der Feldtyp „${field.type}“ ist nicht registriert.`,
  unsupportedLayout: (field) => `Der Feldtyp „${field.type}“ unterstützt „${field.layout}“ nicht.`,
  booleanTrue: 'Ja',
  booleanFalse: 'Nein',
  empty: '—',
};
const formContext = computed<MarkdownFormContextInput>(() => ({
  design: controlDesign.value,
  locale: 'de-AT',
  decorations: fieldDecorations.value,
  messages,
}));

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'empty';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

function resetValues(): void {
  values.value = { ...initialValues };
  showErrors.value = false;
}

function clearValues(): void {
  values.value = Object.fromEntries(
    Object.entries(initialValues).map(([key, value]) => [
      key,
      typeof value === 'boolean' ? false : typeof value === 'number' ? null : '',
    ]),
  );
}

function validateForm(): void {
  showErrors.value = true;
}
</script>

<template>
  <div class="fill-lab">
    <header class="lab-header">
      <div class="lab-brand">
        <span class="lab-brand__mark">M:</span>
        <div>
          <strong>Markdown Fill Lab</strong>
          <small>Inline values without PageBuilder</small>
        </div>
      </div>
      <div class="lab-mode" aria-label="Preview mode">
        <button type="button" :class="{ active: mode === 'template' }" @click="mode = 'template'">
          Template source
        </button>
        <button type="button" :class="{ active: mode === 'fill' }" @click="mode = 'fill'">
          Fill
        </button>
        <button type="button" :class="{ active: mode === 'readonly' }" @click="mode = 'readonly'">
          Readonly
        </button>
      </div>
      <div class="lab-status"><i /> Isolated POC · no Pages</div>
    </header>

    <CoarMarkdownEditorGroup>
      <section class="toolbar-strip">
        <div>
          <span>Markdown toolbar</span>
          <small>Only long-text fields use it</small>
        </div>
        <CoarMarkdownToolbar position="top" />
      </section>

      <main class="lab-workspace">
        <aside class="lab-guide">
          <span>Three responsibilities</span>
          <dl>
            <div>
              <dt>Template</dt>
              <dd>Headings and prose remain fixed while filling.</dd>
            </div>
            <div>
              <dt>Field layout</dt>
              <dd>Named widths, fill rows and full-width fields are template metadata.</dd>
            </div>
            <div>
              <dt>Markdown values</dt>
              <dd>Long text gets a real editor and the shared toolbar.</dd>
            </div>
          </dl>
          <div class="syntax-card">
            <code>:field{…}</code>
            <span>inline / row / stacked value</span>
            <code>:::field{type=markdown …}</code>
            <span>Markdown block value</span>
          </div>
          <div class="context-card">
            <span>Typed context</span>
            <code>design: {{ controlDesign }}</code>
            <div role="group" aria-label="Inline control design">
              <button
                type="button"
                :class="{ active: controlDesign === 'basic' }"
                @click="controlDesign = 'basic'"
              >
                Basic
              </button>
              <button
                type="button"
                :class="{ active: controlDesign === 'coar' }"
                @click="controlDesign = 'coar'"
              >
                Coar
              </button>
            </div>
            <code>field decorations</code>
            <div role="group" aria-label="Field decorations">
              <button
                type="button"
                :class="{ active: fieldDecorations.markdownFrame }"
                :aria-pressed="fieldDecorations.markdownFrame"
                :disabled="mode !== 'readonly'"
                @click="fieldDecorations.markdownFrame = !fieldDecorations.markdownFrame"
              >
                Frame
              </button>
              <button
                type="button"
                :class="{ active: fieldDecorations.inlineUnderline }"
                :aria-pressed="fieldDecorations.inlineUnderline"
                :disabled="mode !== 'readonly'"
                @click="fieldDecorations.inlineUnderline = !fieldDecorations.inlineUnderline"
              >
                Underline
              </button>
            </div>
          </div>
        </aside>

        <article class="template-paper">
          <div v-if="mode === 'template'" class="source-editor">
            <div><span>Template source</span><small>App-local syntax experiment</small></div>
            <textarea v-model="template" spellcheck="false" aria-label="Markdown template source" />
          </div>
          <CoarMarkdownForm
            v-else
            :template="template"
            v-model:values="values"
            :mode="runtimeMode"
            :context="formContext"
            :show-errors="showErrors"
            @validation="validation = $event"
          />
        </article>

        <aside class="value-ledger">
          <header>
            <div><span>Instance values</span><small>Stored separately from Markdown</small></div>
            <div class="value-ledger__actions">
              <button type="button" @click="validateForm">Validate</button>
              <button type="button" @click="clearValues">Clear</button>
              <button type="button" @click="resetValues">Reset</button>
            </div>
          </header>
          <p class="value-ledger__validation" :class="{ valid: validation?.valid }">
            {{
              validation?.valid
                ? 'Valid document'
                : `${Object.keys(validation?.errors ?? {}).length} validation issue(s)`
            }}
          </p>
          <dl>
            <div v-for="([key, value], index) in entries" :key="key">
              <dt>
                <b>{{ String(index + 1).padStart(2, '0') }}</b
                >{{ key }}
              </dt>
              <dd :class="{ empty: value === '' || value === null || value === undefined }">
                {{ displayValue(value) }}
              </dd>
            </div>
          </dl>
        </aside>
      </main>
    </CoarMarkdownEditorGroup>

    <CoarOverlayHost />
  </div>
</template>
