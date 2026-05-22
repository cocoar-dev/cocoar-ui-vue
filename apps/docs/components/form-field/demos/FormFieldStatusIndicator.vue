<template>
  <div class="si-demo">
    <p class="si-demo-instructions">
      Pick a combination — the icon updates per-severity (error wins → red,
      else warning → orange, else hint → grey). Hover the icon for a peek,
      click to pin the popover open. The popover always lists everything that
      applies, in this order: hint, errors, warnings.
    </p>

    <div class="si-controls">
      <CoarCheckbox v-model="withHint" label="Hint" />
      <CoarCheckbox v-model="withWarning" label="Warning" />
      <CoarCheckbox v-model="withMultiErrors" label="Errors (2)" />
    </div>

    <div class="si-form">
      <CoarFormField
        label="Password"
        :hint="withHint ? 'At least 8 characters, mixed case + a digit.' : ''"
        :warning="withWarning ? 'This password is on the common-passwords list.' : ''"
        :error="
          withMultiErrors
            ? ['Too short (min 8 characters).', 'Needs an uppercase letter.']
            : ''
        "
        required
      >
        <CoarTextInput v-model="value" placeholder="Enter a password…" />
      </CoarFormField>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarCheckbox, CoarFormField, CoarTextInput } from '@cocoar/vue-ui';

const value = ref('');
const withHint = ref(true);
const withWarning = ref(false);
const withMultiErrors = ref(false);
</script>

<style scoped>
.si-demo {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 480px;
}
.si-demo-instructions {
  margin: 0;
  font-size: 13px;
  color: var(--coar-text-neutral-secondary);
}
.si-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px;
  background: var(--coar-bg-neutral-secondary);
  border-radius: 6px;
}
.si-form {
  padding: 12px 0;
}
</style>
