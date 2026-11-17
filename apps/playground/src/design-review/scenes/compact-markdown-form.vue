<script setup lang="ts">
// Markdown form, profile-neutral (profile class from an ancestor): inline
// Cocoar and basic (native) controls, a block Markdown field, shown validation
// errors, an invalid template and the readonly output.
//
// The playground's vite.config.ts has no alias for @cocoar/vue-markdown-form and
// the playground does not depend on it, so the source is imported by path (its
// own imports of the other packages go through the playground aliases).
import { CoarMarkdownForm } from '../../../../../packages/markdown-form/src/index';
import '../../../../../packages/markdown-form/styles/markdown-form.css';

const template = `## Visit report

**Name:** :field{id=name type=text layout=row width=fill required placeholder="Full name"}

**Visits:** :field{id=visits type=number} **Approved:** :field{id=ok type=boolean label="Approved"}

:::field{id=summary type=markdown required placeholder="What was discussed?"}

**Missing:** :field{type=text}`;

const values = { name: 'Ada Lovelace', visits: 3, ok: true };
const readonlyValues = { name: 'Ada Lovelace', visits: 3, ok: true, summary: 'Agreed on **two** steps.' };
</script>

<template>
  <section class="vs-section">
    <h2 class="vs-title">Fill mode with errors</h2>
    <div data-scene-part="fill">
      <CoarMarkdownForm :template="template" :values="values" show-errors />
    </div>
  </section>

  <section class="vs-section">
    <h2 class="vs-title">Basic controls and readonly output</h2>
    <div class="vs-stack" style="align-items: stretch">
      <div data-scene-part="basic">
        <CoarMarkdownForm :template="template" :values="values" :context="{ design: 'basic' }" show-errors />
      </div>
      <div data-scene-part="readonly">
        <CoarMarkdownForm :template="template" :values="readonlyValues" mode="readonly" />
      </div>
    </div>
  </section>
</template>
