<!-- Generated from apps/docs/components/form-field.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Form Field

A wrapper component that provides a label, hint text, and an inline error indicator around any form control. Instead of each input managing its own label and validation display, `CoarFormField` handles these concerns in one place.

> **Tip: Field-status indicator**
>
> `hint`, `warning`, and `error` all surface through one **status icon** in the label row, opening a popover that lists everything that applies. The icon picks the most severe state: error → red `circle-alert`, else warning → orange `triangle-alert`, else hint → grey `info`. When nothing is set, no icon renders.
>
> The icon is conditionally rendered — when it appears the label-text shifts right by `icon-width + gap`. That small horizontal nudge is the attention signal; the form's vertical geometry stays stable. Hover the icon for a peek, click to pin the popover open.

```ts
import { CoarFormField } from '@cocoar/vue-ui';
```

## Basic Usage

Wrap any form control in `CoarFormField` and pass `label`, `hint`, or `error` props. The label is automatically associated with the input inside via generated IDs.

**Demo — `form-field/demos/FormFieldBasic.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 16px; max-width: 320px;">
    <CoarFormField label="Full Name" hint="Enter your first and last name">
      <CoarTextInput v-model="name" placeholder="Jane Doe" />
    </CoarFormField>
    <CoarFormField label="Email" error="Please enter a valid email address">
      <CoarTextInput value="not-an-email" />
    </CoarFormField>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarTextInput, CoarFormField } from '@cocoar/vue-ui';

const name = ref('');
</script>
```

## Layout and Label Position

`CoarFormField` can place its label before or after any control, either stacked or inline. All four combinations have a visible effect. Inline layouts are especially useful when the field label is the only label of a checkbox or switch; leave the control's own `label` unset in that case.

**Demo — `form-field/demos/FormFieldLayouts.vue`**

```vue
<template>
  <div class="layout-demo">
    <section>
      <h4>Inline — label after</h4>
      <CoarFormField
        label="User active"
        hint="Disabled users cannot sign in."
        layout="inline"
        label-position="after"
      >
        <CoarCheckbox v-model="active" />
      </CoarFormField>
    </section>

    <section>
      <h4>Inline — label before</h4>
      <CoarFormField
        label="User active"
        hint="Disabled users cannot sign in."
        layout="inline"
        label-position="before"
      >
        <CoarCheckbox v-model="active" />
      </CoarFormField>
    </section>

    <section>
      <h4>Text input — inline after</h4>
      <CoarFormField
        label="Name"
        hint="This intentionally demonstrates that every prop combination has an effect."
        layout="inline"
        label-position="after"
      >
        <CoarTextInput v-model="name" placeholder="Ada Lovelace" />
      </CoarFormField>
    </section>

    <section>
      <h4>Text input — stacked after</h4>
      <CoarFormField
        label="Name"
        hint="The label can also deliberately follow the control."
        layout="stacked"
        label-position="after"
      >
        <CoarTextInput v-model="name" placeholder="Ada Lovelace" />
      </CoarFormField>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarCheckbox, CoarFormField, CoarTextInput } from '@cocoar/vue-ui';

const active = ref(false);
const name = ref('');
</script>

<style scoped>
.layout-demo {
  display: grid;
  gap: 24px;
}

.layout-demo section {
  display: grid;
  gap: 8px;
}

.layout-demo h4 {
  margin: 0;
  color: var(--coar-text-neutral-secondary);
  font-size: 12px;
  font-weight: 500;
}
</style>
```

## Status Indicator

Toggle hint / warning / error individually and watch the icon shift severity and the popover stack content in priority order (hint → errors → warnings). Hover the icon, or click to pin.

**Demo — `form-field/demos/FormFieldStatusIndicator.vue`**

```vue
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
```

## Live Rules

Pass a `rules` array for live-evaluated validation. Each rule has a `label`, a `fulfilled: boolean` (the consumer computes this from reactive state — Vue re-evaluates on every state change), and optional `whenPass` / `whenFail` flags that control what to render in each state. **Defaults**: `whenPass: 'success'` and `whenFail: 'pending'` — that's the password-checklist UX (✓ green when fulfilled, ○ grey when not), so a bare `{ label, fulfilled }` rule is the common case.

Import the named types for IntelliSense:

```ts
import type {
  CoarFormFieldRule,             // the rule object
  CoarFormFieldRulePassMode,     // 'success' | 'hide'
  CoarFormFieldRuleFailMode,     // 'pending' | 'warning' | 'error' | 'hide'
} from '@cocoar/vue-ui';

const rules: CoarFormFieldRule[] = [...];
```

**Demo — `form-field/demos/FormFieldPasswordRules.vue`**

```vue
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
```

### Display modes

The two-axis `whenPass` / `whenFail` covers every common pattern:

| `whenPass` | `whenFail` | Pattern | Example |
|---|---|---|---|
| `'success'` (default) | `'pending'` (default) | Progress checklist | Password policies — ✓ green when met, ○ grey when not |
| `'hide'` | `'error'` | Live validation | "Max 20 chars" — disappears when ok, red error when not |
| `'hide'` | `'warning'` | Live advisory | "Looks like a tracking link" — disappears when fine, orange warning when not |
| `'success'` | `'error'` | Required with progress tick | Hard requirement that's also part of a checklist |

The defaults (`whenPass: 'success'`, `whenFail: 'pending'`) give you the password-checklist pattern with zero extra config.

### Trigger-icon severity

The icon reflects **what's visible in the popover** — pick the highest-severity section that has at least one entry:

1. Popover has ≥1 entry in the **Errors** section → red `circle-alert`
2. else popover has ≥1 entry in the **Warnings** section → orange `triangle-alert`
3. else popover has ≥1 **success** item (a fulfilled `whenPass: 'success'` rule, i.e. a green ✓) → green `check-circle-2`
4. else popover has ≥1 **pending** checklist item or a hint → grey `info`
5. else → no icon at all

Notice that **success wins over pending** — once the user has fulfilled *any* rule, the icon flips green for positive reinforcement. The unfulfilled rules still appear as ○ in the popover so the user can hover to see the "could do more" detail; the icon just doesn't shout orange about them.

For genuinely **required** rules (must-do-this), use `whenFail: 'error'` — those make the field invalid and the icon stays red until satisfied. Pending is for **optional** progress (part of an X-of-Y, polish-up rules, or any "could do more for strength but already valid" pattern). The Save-button-disabled state binds to `hasError` (or the `aria-invalid` attribute on the input), not to the icon color.

### Why no green check for `whenPass: 'hide'` rules

A rule whose natural state is "no problem" shouldn't show a green checkmark when satisfied — there's nothing to celebrate; the field is just fine. The trigger icon stays unset unless something is actively wrong or you have explicit `whenPass: 'success'` rules to show progress.

### Icon ≠ Validity — composing rules for "Save disabled" UX

**The icon shows visual state. `hasError` (via the `FORM_FIELD_INJECTION_KEY`) shows validity.** They're related but deliberately decoupled — `whenFail: 'pending'` and `whenFail: 'warning'` rules contribute to the icon but **not** to `hasError`. Only `whenFail: 'error'` rules (plus the `error` string-prop) make the field invalid.

That decoupling is intentional. It lets you express more than "every rule is mandatory":

#### Pattern: each rule individually required

Each rule both shows progress AND drives validity. `whenFail: 'error'` on every entry — the rule appears in the popover's Errors section while unfulfilled, flips to a green ✓ in the checklist when fulfilled.

```ts
const rules = computed<CoarFormFieldRule[]>(() => [
  { label: 'At least 8 chars', fulfilled: pw.length >= 8, whenFail: 'error' },
  { label: 'Contains an uppercase letter', fulfilled: /[A-Z]/.test(pw), whenFail: 'error' },
  // …
]);
```

#### Pattern: X of Y must be satisfied

The 4 individual rules stay as `pending` progress (default), and a 5th **aggregate rule** with `whenFail: 'error'` checks the count. Both coexist in the popover — the user sees per-rule progress AND why the field is currently invalid. The Save button binds to the aggregate's `fulfilled` flag (or to the field's injected `hasError`), not to the icon.

**Demo — `form-field/demos/FormFieldXofYRules.vue`**

```vue
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
```

The same pattern handles any aggregate constraint: "at least 2 tags selected", "between 5 and 50 items", "either email OR phone filled" — one extra rule with `whenFail: 'error'` does the gating.

> **Tip: Why the icon goes green at 3/4 (not orange)**
>
> The severity model picks the highest-severity item visible in the popover. With 3 ✓ and 1 ○ showing, success wins over pending — the icon goes green. The unfulfilled rule stays as ○ in the popover so the user can hover to see "could do more for strength", but the summary icon respects that validity is passing. See [Trigger-icon severity](#trigger-icon-severity) for the full priority order.

## On-Submit Validation

The canonical on-submit-validation pattern: every required field starts clean, the user fills what they like, hits **Submit**, and any missing / invalid fields flip to the error state. The error icon appears in the label row, shifting the label-text right by `icon-width + gap` — a small horizontal nudge that catches the eye **without** any vertical row push that would move the Submit button or rearrange the form.

**Demo — `form-field/demos/FormFieldZeroShift.vue`**

```vue
<template>
  <div class="zs-demo">
    <p class="zs-demo-instructions">
      Click <strong>Submit</strong> with empty fields — every required field flips
      to the error state at the same time. The labels shift right by the icon
      width: a small horizontal nudge that catches the eye, while the form's
      vertical layout stays put (no row appears below the input, the Submit
      button doesn't move). Hover any error icon for the message.
    </p>

    <div class="zs-form">
      <CoarFormField label="First name" :error="errors.first" required>
        <CoarTextInput v-model="first" placeholder="Jane" />
      </CoarFormField>
      <CoarFormField label="Last name" :error="errors.last" required>
        <CoarTextInput v-model="last" placeholder="Doe" />
      </CoarFormField>
      <CoarFormField label="Email" :error="errors.email" required>
        <CoarTextInput v-model="email" placeholder="jane@example.com" />
      </CoarFormField>
      <CoarFormField label="Account type" :error="errors.kind" required>
        <CoarSelect v-model="kind" :options="kinds" placeholder="Pick one" />
      </CoarFormField>
      <CoarFormField label="Country" :error="errors.country" required>
        <CoarSelect v-model="country" :options="countries" placeholder="Pick one" />
      </CoarFormField>
    </div>

    <div class="zs-actions">
      <CoarButton @click="reset">Reset</CoarButton>
      <CoarButton variant="primary" @click="submit">
        Submit{{ errorCount > 0 ? ` (${errorCount})` : '' }}
      </CoarButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import {
  CoarButton,
  CoarFormField,
  CoarSelect,
  CoarTextInput,
  type CoarSelectOption,
} from '@cocoar/vue-ui';

const first = ref('');
const last = ref('');
const email = ref('');
const kind = ref<string | null>(null);
const country = ref<string | null>(null);
const attempted = ref(false);

const kinds: CoarSelectOption<string>[] = [
  { value: 'personal', label: 'Personal' },
  { value: 'business', label: 'Business' },
];
const countries: CoarSelectOption<string>[] = [
  { value: 'us', label: 'United States' },
  { value: 'de', label: 'Germany' },
  { value: 'at', label: 'Austria' },
];

// Errors only populate after the first submit attempt — until then the form
// is "clean" even with empty fields. After the first submit, errors update
// reactively as the user types (live-revalidate). This is the most common
// on-submit pattern; CoarFormField doesn't care about the timing, it just
// reflects whatever string you pass.
const errors = reactive({
  first: '',
  last: '',
  email: '',
  kind: '',
  country: '',
});

const errorCount = computed(
  () => Object.values(errors).filter((m) => m.length > 0).length,
);

function validate() {
  errors.first = first.value.trim() ? '' : 'First name is required.';
  errors.last = last.value.trim() ? '' : 'Last name is required.';
  errors.email = email.value.trim()
    ? /.+@.+\..+/.test(email.value)
      ? ''
      : 'Enter a valid email address.'
    : 'Email is required.';
  errors.kind = kind.value ? '' : 'Pick an account type.';
  errors.country = country.value ? '' : 'Pick a country.';
}

function submit() {
  attempted.value = true;
  validate();
}

function reset() {
  first.value = '';
  last.value = '';
  email.value = '';
  kind.value = null;
  country.value = null;
  attempted.value = false;
  Object.assign(errors, { first: '', last: '', email: '', kind: '', country: '' });
}
</script>

<style scoped>
.zs-demo {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.zs-demo-instructions {
  margin: 0;
  font-size: 13px;
  color: var(--coar-text-neutral-secondary);
}
.zs-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  max-width: 560px;
}
.zs-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  max-width: 560px;
}
</style>
```

The shift is the point. A reserved-slot approach (icon hidden via `visibility` to keep the label at a fixed offset) would be visually quieter but would also lose the cue — users wouldn't notice the state change. The icon-in-label-with-shift pattern strikes the balance: noticeable, but never disorienting.

## Grouping Controls

Use `CoarFormField` to add a group label and shared error to a set of checkboxes or radio buttons. Each checkbox keeps its own inline `label` prop for the option text.

**Demo — `form-field/demos/FormFieldCheckboxGroup.vue`**

```vue
<template>
  <div style="max-width: 400px">
    <CoarFormField
      label="Permissions"
      :error="permissionsError"
      hint="Select at least one permission"
      required
    >
      <CoarCheckboxGroup v-model="permissions">
        <CoarCheckbox value="read" label="Read — View content" />
        <CoarCheckbox value="write" label="Write — Create and edit content" />
        <CoarCheckbox value="admin" label="Admin — Manage users and settings" />
      </CoarCheckboxGroup>
    </CoarFormField>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { CoarCheckbox, CoarCheckboxGroup, CoarFormField } from '@cocoar/vue-ui';

const permissions = ref<string[]>([]);

const permissionsError = computed(() => {
  if (permissions.value.length === 0) {
    return 'At least one permission is required';
  }
  return '';
});
</script>
```

## Registration Form

A complete registration form with submit-on-click validation. Errors only appear after the user attempts to submit.

**Demo — `form-field/demos/FormRegistration.vue`**

```vue
<template>
  <form class="demo-form" @submit.prevent="onSubmit">
    <CoarFormField label="Full Name" :error="errors.name" required>
      <CoarTextInput v-model="form.name" placeholder="Jane Doe" required />
    </CoarFormField>

    <CoarFormField label="Email" :error="errors.email" hint="We'll never share your email" required>
      <CoarTextInput v-model="form.email" placeholder="jane@example.com" required />
    </CoarFormField>

    <CoarFormField label="Password" :error="errors.password" hint="At least 8 characters" required>
      <CoarPasswordInput v-model="form.password" required />
    </CoarFormField>

    <CoarFormField label="Role" :error="errors.role" required>
      <CoarSelect v-model="form.role" :options="roles" placeholder="Select a role..." />
    </CoarFormField>

    <CoarFormField label="Department">
      <CoarSelect v-model="form.department" :options="departments" placeholder="Optional..." />
    </CoarFormField>

    <CoarFormField :error="errors.terms">
      <CoarCheckbox v-model="form.terms" label="I agree to the terms and conditions" />
    </CoarFormField>

    <div class="demo-form__actions">
      <CoarButton type="submit" :disabled="!isValid">Create Account</CoarButton>
    </div>

    <CoarNote v-if="submitted" variant="success" padding="s">
      Account created successfully!
    </CoarNote>
  </form>
</template>

<script setup lang="ts">
import { reactive, ref, computed } from 'vue';
import { CoarFormField, CoarTextInput, CoarPasswordInput, CoarSelect, CoarCheckbox, CoarButton, CoarNote } from '@cocoar/vue-ui';
import type { CoarSelectOption } from '@cocoar/vue-ui';

const form = reactive({
  name: '',
  email: '',
  password: '',
  role: null as string | null,
  department: null as string | null,
  terms: false,
});

const submitted = ref(false);
const touched = ref(false);

const roles: CoarSelectOption<string>[] = [
  { value: 'developer', label: 'Developer' },
  { value: 'designer', label: 'Designer' },
  { value: 'manager', label: 'Manager' },
  { value: 'qa', label: 'QA Engineer' },
];

const departments: CoarSelectOption<string>[] = [
  { value: 'engineering', label: 'Engineering' },
  { value: 'product', label: 'Product' },
  { value: 'marketing', label: 'Marketing' },
];

const errors = computed(() => {
  if (!touched.value) return { name: '', email: '', password: '', role: '', terms: '' };
  return {
    name: form.name.length === 0 ? 'Name is required' : '',
    email: form.email.length === 0 ? 'Email is required' : !form.email.includes('@') ? 'Enter a valid email' : '',
    password: form.password.length === 0 ? 'Password is required' : form.password.length < 8 ? 'At least 8 characters' : '',
    role: !form.role ? 'Please select a role' : '',
    terms: !form.terms ? 'You must accept the terms' : '',
  };
});

const isValid = computed(() =>
  form.name.length > 0 &&
  form.email.includes('@') &&
  form.password.length >= 8 &&
  form.role !== null &&
  form.terms
);

function onSubmit() {
  touched.value = true;
  if (isValid.value) {
    submitted.value = true;
  }
}
</script>

<style scoped>
.demo-form {
  display: flex;
  flex-direction: column;
  gap: var(--coar-spacing-m);
  max-width: 400px;
}
.demo-form__actions {
  padding-top: var(--coar-spacing-s);
}
</style>
```

## Settings Panel

A settings page using every form control type — text inputs, textareas, selects, checkboxes, radio groups, and switches — all wrapped in `CoarFormField` for consistent layout.

**Demo — `form-field/demos/FormSettings.vue`**

```vue
<template>
  <form class="demo-form" @submit.prevent>
    <CoarFormField label="Display Name" hint="This is shown publicly">
      <CoarTextInput v-model="displayName" placeholder="Your display name" />
    </CoarFormField>

    <CoarFormField label="Bio">
      <CoarTextInput v-model="bio" placeholder="Tell us about yourself..." :rows="3" />
    </CoarFormField>

    <CoarFormField label="Language">
      <CoarSelect v-model="language" :options="languages" />
    </CoarFormField>

    <CoarFormField label="Notifications">
      <div class="demo-checks">
        <CoarCheckbox v-model="emailNotifs" label="Email notifications" />
        <CoarCheckbox v-model="pushNotifs" label="Push notifications" />
        <CoarCheckbox v-model="weeklyDigest" label="Weekly digest" />
      </div>
    </CoarFormField>

    <CoarFormField label="Theme">
      <CoarRadioGroup v-model="theme" name="theme" orientation="horizontal">
        <CoarRadioButton value="light" label="Light" />
        <CoarRadioButton value="dark" label="Dark" />
        <CoarRadioButton value="system" label="System" />
      </CoarRadioGroup>
    </CoarFormField>

    <CoarFormField label="Experimental Features">
      <CoarSwitch v-model="experiments" label="Enable beta features" />
    </CoarFormField>

    <div class="demo-form__actions">
      <CoarButton>Save Settings</CoarButton>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarFormField, CoarTextInput, CoarSelect, CoarCheckbox, CoarRadioGroup, CoarRadioButton, CoarSwitch, CoarButton } from '@cocoar/vue-ui';
import type { CoarSelectOption } from '@cocoar/vue-ui';

const displayName = ref('Jane Doe');
const bio = ref('');
const language = ref('en');
const emailNotifs = ref(true);
const pushNotifs = ref(false);
const weeklyDigest = ref(true);
const theme = ref('system');
const experiments = ref(false);

const languages: CoarSelectOption<string>[] = [
  { value: 'en', label: 'English' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Français' },
  { value: 'es', label: 'Español' },
];
</script>

<style scoped>
.demo-form {
  display: flex;
  flex-direction: column;
  gap: var(--coar-spacing-m);
  max-width: 400px;
}
.demo-checks {
  display: flex;
  flex-direction: column;
  gap: var(--coar-spacing-s);
}
.demo-form__actions {
  padding-top: var(--coar-spacing-s);
}
</style>
```

## Validation with vee-validate

`CoarFormField` integrates seamlessly with [vee-validate](https://vee-validate.logaretm.com/) and [Zod](https://zod.dev/) schemas. Use `useField()` to get reactive `value` and `errorMessage` refs, then bind them to the input and `CoarFormField` respectively.

**Demo — `form-field/demos/FormVeeValidate.vue`**

```vue
<template>
  <form class="demo-form" @submit="onSubmit">
    <CoarFormField label="Email" :error="emailError" required>
      <CoarTextInput v-model="email" placeholder="jane@example.com" required />
    </CoarFormField>

    <CoarFormField label="Password" :error="passwordError" hint="At least 8 characters" required>
      <CoarPasswordInput v-model="password" required />
    </CoarFormField>

    <CoarFormField label="Confirm Password" :error="confirmError" required>
      <CoarPasswordInput v-model="confirm" required />
    </CoarFormField>

    <CoarFormField :error="termsError">
      <CoarCheckbox v-model="terms" label="I accept the terms of service" />
    </CoarFormField>

    <div class="demo-form__actions">
      <CoarButton type="submit">Sign Up</CoarButton>
    </div>

    <CoarNote v-if="submitted" variant="success" padding="s">
      Form submitted successfully!
    </CoarNote>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useForm, useField } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import { z } from 'zod';
import { CoarFormField, CoarTextInput, CoarPasswordInput, CoarCheckbox, CoarButton, CoarNote } from '@cocoar/vue-ui';

const schema = toTypedSchema(
  z.object({
    email: z.string().min(1, 'Email is required').email('Enter a valid email'),
    password: z.string().min(8, 'At least 8 characters'),
    confirm: z.string().min(1, 'Please confirm your password'),
    terms: z.literal(true, { errorMap: () => ({ message: 'You must accept the terms' }) }),
  }).refine((data) => data.password === data.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  }),
);

const submitted = ref(false);

const { handleSubmit } = useForm({ validationSchema: schema });

const { value: email, errorMessage: emailError } = useField<string>('email', undefined, { initialValue: '' });
const { value: password, errorMessage: passwordError } = useField<string>('password', undefined, { initialValue: '' });
const { value: confirm, errorMessage: confirmError } = useField<string>('confirm', undefined, { initialValue: '' });
const { value: terms, errorMessage: termsError } = useField<boolean>('terms', undefined, { initialValue: false });

const onSubmit = handleSubmit(() => {
  submitted.value = true;
});
</script>

<style scoped>
.demo-form {
  display: flex;
  flex-direction: column;
  gap: var(--coar-spacing-m);
  max-width: 400px;
}
.demo-form__actions {
  padding-top: var(--coar-spacing-s);
}
</style>
```

> **Tip: Other validation libraries**
>
> `CoarFormField` is library-agnostic — it just takes an `error` string. Any validation approach works: vee-validate, vuelidate, or plain computed properties.

## Standalone Form Controls

Form controls work without `CoarFormField` when no label or validation is needed — inline search inputs, table checkboxes, toolbar buttons.

```vue
<!-- No label needed -->
<CoarTextInput v-model="search" placeholder="Search..." />

<!-- Inline checkbox with its own label -->
<CoarCheckbox v-model="agree" label="I agree" />
```

## Accessibility

`CoarFormField` generates unique IDs automatically and wires them through `aria-describedby` on the child input:

- **Label**: `<label for="...">` points to the input — clicking the label focuses the control.
- **Hint** / **errors** / **warnings**: each rendered as a visually-hidden span with its own ID. The child input's `aria-describedby` is the **space-separated list** of all currently-present IDs (hint first, then every error, then every warning). Screen readers read them all on focus.
- **Errors** additionally carry `role="alert"` so they're announced when they appear (warnings + hint are silent — they're descriptive, not urgent).
- **`aria-invalid="true"`** on the input is driven by `error` only; warnings keep the input valid.
- **Required**: asterisk is `aria-hidden="true"` — use `required` on the input itself for semantics.

## API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | `undefined` | Label text rendered next to the status icon. |
| `hint` | `string` | `''` | Informational help text. Sits at the top of the popover (grey). When it's the only thing set, the icon is a grey `info` glyph. |
| `error` | `string \| readonly string[]` | `[]` | Validation error(s). Drives the red `circle-alert` icon + `aria-invalid="true"` on the child input. Single string is sugar for a one-item array. Each entry is announced as a `role="alert"` to screen readers. |
| `warning` | `string \| readonly string[]` | `[]` | Non-blocking warning(s). Drives the orange `triangle-alert` icon (when no error is also set). The input stays valid; SR announcements are non-urgent. |
| `rules` | `readonly CoarFormFieldRule[]` | `[]` | Live-validation rules. Each rule has `label`, `fulfilled: boolean`, and optional `whenPass: 'success' \| 'hide'` (default `'success'`) + `whenFail: 'pending' \| 'warning' \| 'error' \| 'hide'` (default `'pending'`). See [Live Rules](#live-rules) for the four common patterns. Rules with `whenFail: 'error'` drive the input's `aria-invalid="true"`. |
| `layout` | `'stacked' \| 'inline'` | `'stacked'` | Places the label/status cluster and control vertically or on one row. |
| `labelPosition` | `'before' \| 'after'` | `'before'` | Places the complete label/status cluster before or after the control. Works in both layouts. |
| `required` | `boolean` | `false` | Show required asterisk next to label. |
| `disabled` | `boolean` | `false` | Disabled state — propagated to child inputs. |
| `id` | `string` | auto | Explicit input ID (auto-generated if omitted). |

### Slots

| Slot | Description |
|------|-------------|
| `default` | The form control(s) to wrap |
