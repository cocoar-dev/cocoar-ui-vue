<template>
  <div class="pwr-demo">
    <p class="pwr-instructions">
      Three rule patterns coexist below. <strong>Password</strong> uses
      the default checklist style (✓ green when fulfilled, ○ grey when
      not, popover icon walks grey → orange → green). <strong>Confirm
      password</strong> is a single match-rule with the same defaults.
      <strong>Display name</strong> shows the live-error pattern
      (<code>whenPass: 'hide'</code>, <code>whenFail: 'error'</code>) —
      type past 20 characters and the indicator flips red immediately,
      delete and it vanishes. No icon when within the limit; live
      validation is the kind of rule that should disappear when fine.
    </p>

    <div class="pwr-form">
      <CoarFormField
        label="Password"
        :rules="passwordRules"
        required
      >
        <CoarPasswordInput v-model="password" placeholder="Enter a password…" />
      </CoarFormField>

      <CoarFormField
        label="Confirm password"
        :rules="confirmRules"
        required
      >
        <CoarPasswordInput v-model="confirm" placeholder="Repeat the password…" />
      </CoarFormField>

      <CoarFormField label="Display name" :rules="displayNameRules">
        <CoarTextInput v-model="displayName" placeholder="Max 20 characters…" />
      </CoarFormField>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  CoarFormField,
  CoarPasswordInput,
  CoarTextInput,
  type CoarFormFieldRule,
} from '@cocoar/vue-ui';

const password = ref('');
const confirm = ref('');
const displayName = ref('');

// Defaults: `whenPass: 'success'`, `whenFail: 'pending'` → password-checklist
// style. No need to spell them out.
const passwordRules = computed<CoarFormFieldRule[]>(() => [
  { label: 'At least 8 characters', fulfilled: password.value.length >= 8 },
  { label: 'Contains an uppercase letter', fulfilled: /[A-Z]/.test(password.value) },
  { label: 'Contains a lowercase letter', fulfilled: /[a-z]/.test(password.value) },
  { label: 'Contains a digit', fulfilled: /\d/.test(password.value) },
  { label: 'Contains a symbol', fulfilled: /[^A-Za-z0-9]/.test(password.value) },
]);

// Confirm-password match is a HARD requirement — the field is invalid until
// the match holds. `whenFail: 'error'` drives `aria-invalid="true"` and
// `hasError` on the field so a Save button bound to that signal can stay
// disabled. The popover shows the rule in the Errors section while broken,
// and (because `whenPass` defaults to `'success'`) flips to a green ✓ in
// the checklist once the passwords match.
const confirmRules = computed<CoarFormFieldRule[]>(() => [
  {
    label: 'Matches the password',
    fulfilled: confirm.value === password.value && confirm.value.length > 0,
    whenFail: 'error',
  },
]);

// Live-validation pattern: whenPass=hide, whenFail=error. The rule vanishes
// when the value is fine and flips to a red error indicator the moment the
// user types past the limit. Aria-invalid + error border are driven
// automatically; consumer doesn't have to track an `error` string.
// Importing `CoarFormFieldRule` gives IntelliSense on `whenPass`/`whenFail`.
const displayNameRules = computed<CoarFormFieldRule[]>(() => [
  {
    label: 'Max 20 characters',
    fulfilled: displayName.value.length <= 20,
    whenPass: 'hide',
    whenFail: 'error',
  },
]);
</script>

<style scoped>
.pwr-demo {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 460px;
}
.pwr-instructions {
  margin: 0;
  font-size: 13px;
  color: var(--coar-text-neutral-secondary);
}
.pwr-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
