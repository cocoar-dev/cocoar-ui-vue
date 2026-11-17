<script setup lang="ts">
import './compact-fonts';
/**
 * Compact profile (`.coar-compact`, Preview): both form-field status panels open — hint,
 * errors and warning (`CoarFormFieldStatusPanel` sections) and the rule checklist.
 */
import { CoarFormField, CoarTextInput } from '@cocoar/vue-ui';

const rules = [
  { label: 'Mindestens 8 Zeichen', fulfilled: true },
  { label: 'Ein Großbuchstabe', fulfilled: false },
  { label: 'Eine Ziffer (0–9)', fulfilled: false, whenFail: 'warning' as const },
  { label: 'Keine Leerzeichen', fulfilled: true, whenPass: 'success' as const },
];
</script>

<template>
  <div class="coar-compact" data-interaction="form-status">
    <section class="vs-section">
      <h2 class="vs-title">Status panels open: hint, errors and warning; rule checklist</h2>
      <!-- Far enough from the edges and each other that both panels open below their icons. -->
      <div class="vs-row" style="align-items: flex-start; gap: 64px; padding-left: 176px">
        <div style="width: 240px" data-status="messages">
          <CoarFormField
            label="Passwort"
            hint="Mindestens 8 Zeichen, Groß- und Kleinbuchstaben und eine Ziffer."
            :error="['Zu kurz (mindestens 8 Zeichen).', 'Ein Großbuchstabe fehlt.']"
            warning="Dieses Passwort steht auf der Liste häufiger Passwörter."
            required
          >
            <CoarTextInput model-value="abc" />
          </CoarFormField>
        </div>
        <div style="width: 220px" data-status="rules">
          <CoarFormField label="Neues Passwort" :rules="rules">
            <CoarTextInput model-value="abcdefgh" />
          </CoarFormField>
        </div>
      </div>
    </section>
  </div>
</template>
