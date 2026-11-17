<script setup lang="ts">
// Markdown form paragraph layouts, profile-neutral: `layout=row` (label beside the
// control) and `layout=stacked` (label above), each with a filled and a required empty
// field, editable through v-model. The legacy scene (compact-markdown-form.vue) covers
// inline fields, basic controls and readonly output; this one only the two paragraph
// layouts.
// No playground alias for @cocoar/vue-markdown-form: imported by path.
import { ref } from 'vue';
import { CoarMarkdownForm } from '../../../../../packages/markdown-form/src/index';
import '../../../../../packages/markdown-form/styles/markdown-form.css';

const rowTemplate = `**Name:** :field{id=name type=text layout=row width=fill required placeholder="Vollständiger Name"}

**Abteilung:** :field{id=dept type=text layout=row width=fill required placeholder="Abteilung"}`;

const stackedTemplate = `**Zuständigkeitsübertragung:** :field{id=owner type=text layout=stacked width=fill required placeholder="Neue Zuständigkeit"}

**Prüfungsergebnis:** :field{id=result type=text layout=stacked width=fill required placeholder="Ergebnis"}`;

const rowValues = ref<Record<string, unknown>>({ name: 'Ada Lovelace' });
const stackedValues = ref<Record<string, unknown>>({ owner: 'Grace Hopper' });
</script>

<template>
  <section class="vs-section">
    <h2 class="vs-title">layout=row</h2>
    <div data-scene-part="row">
      <CoarMarkdownForm v-model:values="rowValues" :template="rowTemplate" show-errors />
    </div>
  </section>
  <section class="vs-section">
    <h2 class="vs-title">layout=stacked</h2>
    <div data-scene-part="stacked">
      <CoarMarkdownForm v-model:values="stackedValues" :template="stackedTemplate" show-errors />
    </div>
  </section>
</template>
