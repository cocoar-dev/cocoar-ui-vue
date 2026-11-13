<script setup lang="ts">
import { CoarFormField, CoarTextInput } from '@cocoar/vue-ui';

const rules = [
  { label: 'At least 8 characters', fulfilled: true },
  { label: 'An uppercase letter', fulfilled: false },
  { label: 'A digit', fulfilled: false, whenFail: 'warning' as const },
  { label: 'No spaces', fulfilled: true, whenPass: 'success' as const },
];
</script>

<template>
  <section class="vs-section">
    <h2 class="vs-title">Status panels open: hint, errors and warning; rule checklist</h2>
    <!-- Fields far enough from the left edge and from each other that both panels
         open below their icons (near the edge the panel falls back to the side). -->
    <div class="vs-row" style="align-items: flex-start; gap: 64px; padding-left: 176px">
      <div style="width: 240px" data-status="messages">
        <CoarFormField
          label="Password"
          hint="At least 8 characters, mixed case and a digit."
          :error="['Too short (min 8 characters).', 'Needs an uppercase letter.']"
          warning="This password is on the common-passwords list."
          required
        >
          <CoarTextInput model-value="abc" />
        </CoarFormField>
      </div>
      <div style="width: 220px" data-status="rules">
        <CoarFormField label="New password" :rules="rules">
          <CoarTextInput model-value="abcdefgh" />
        </CoarFormField>
      </div>
    </div>
  </section>
</template>
