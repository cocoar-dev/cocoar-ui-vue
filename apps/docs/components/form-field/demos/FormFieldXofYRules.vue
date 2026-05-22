<template>
  <div class="xy-demo">
    <p class="xy-instructions">
      "Pick at least <strong>3 of the 4</strong> character types" — the four
      individual rules stay as visual progress (✓ green / ○ grey, default
      <code>whenFail: 'pending'</code>), and a fifth aggregate rule with
      <code>whenFail: 'error'</code> guards validity. Save stays disabled
      until the aggregate is satisfied — bound to the rule's
      <code>fulfilled</code> flag, not the icon. Hover the icon to see both
      the progress and the gating-error in one popover.
    </p>

    <div class="xy-form">
      <CoarFormField label="Password" :rules="rules" required>
        <CoarPasswordInput v-model="password" placeholder="Mix character types…" />
      </CoarFormField>

      <div class="xy-actions">
        <span class="xy-progress">
          {{ metCount }} of 4 character types
        </span>
        <CoarButton variant="primary" :disabled="!aggregateMet" @click="onSave">
          {{ saved ? 'Saved!' : 'Save' }}
        </CoarButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  CoarButton,
  CoarFormField,
  CoarPasswordInput,
  type CoarFormFieldRule,
} from '@cocoar/vue-ui';

const password = ref('');
const saved = ref(false);

// 4 individual character-class rules — pure progress visual (defaults).
// They show as a checklist; they don't make the field invalid on their own.
const individualRules = computed<CoarFormFieldRule[]>(() => [
  { label: 'Contains an uppercase letter', fulfilled: /[A-Z]/.test(password.value) },
  { label: 'Contains a lowercase letter', fulfilled: /[a-z]/.test(password.value) },
  { label: 'Contains a digit', fulfilled: /\d/.test(password.value) },
  { label: 'Contains a symbol', fulfilled: /[^A-Za-z0-9]/.test(password.value) },
]);

const metCount = computed(() => individualRules.value.filter((r) => r.fulfilled).length);
const aggregateMet = computed(() => metCount.value >= 3);

// Combine: 4 progress rules + 1 aggregate-error rule. The aggregate is the
// validity gate — `whenFail: 'error'` makes the field invalid until the
// count threshold is reached, and the rule shows as a red error in the
// popover's Errors section while broken. `whenPass: 'hide'` keeps the
// aggregate from showing as a green ✓ when satisfied (it's a meta-rule
// about the OTHER rules, not a separate thing the user achieved).
//
// The `password.length === 0` clause keeps the aggregate silent on initial
// empty input — the field has rules but the user hasn't started yet, so
// don't shout an error. The icon falls back to the grey "click me, there
// are rules" hint state; once the user types one char, the aggregate
// evaluates for real.
const rules = computed<CoarFormFieldRule[]>(() => [
  ...individualRules.value,
  {
    label: `At least 3 of the 4 character types (currently ${metCount.value})`,
    fulfilled: aggregateMet.value || password.value.length === 0,
    whenPass: 'hide',
    whenFail: 'error',
  },
]);

function onSave() {
  saved.value = true;
  setTimeout(() => (saved.value = false), 1500);
}
</script>

<style scoped>
.xy-demo {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 460px;
}
.xy-instructions {
  margin: 0;
  font-size: 13px;
  color: var(--coar-text-neutral-secondary);
}
.xy-instructions code {
  background: var(--coar-bg-neutral-tertiary);
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 12px;
}
.xy-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.xy-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.xy-progress {
  font-size: 13px;
  color: var(--coar-text-neutral-secondary);
}
</style>
