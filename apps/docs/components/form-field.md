---
description: "CoarFormField — label, hint and validation wrapper for form controls with a severity-aware status icon, pinnable popover and live-evaluated rules"
---

# Form Field

A wrapper component that provides a label, hint text, and an inline error indicator around any form control. Instead of each input managing its own label and validation display, `CoarFormField` handles these concerns in one place.

::: tip Field-status indicator
`hint`, `warning`, and `error` all surface through one **status icon** in the label row, opening a popover that lists everything that applies. The icon picks the most severe state: error → red `circle-alert`, else warning → orange `triangle-alert`, else hint → grey `info`. When nothing is set, no icon renders.

The icon is conditionally rendered — when it appears the label-text shifts right by `icon-width + gap`. That small horizontal nudge is the attention signal; the form's vertical geometry stays stable. Hover the icon for a peek, click to pin the popover open.
:::

```ts
import { CoarFormField } from '@cocoar/vue-ui';
```

## Basic Usage

Wrap any form control in `CoarFormField` and pass `label`, `hint`, or `error` props. The label is automatically associated with the input inside via generated IDs.

<preview path="./form-field/demos/FormFieldBasic.vue" />

## Layout and Label Position

`CoarFormField` can place its label before or after any control, either stacked or inline. All four combinations have a visible effect. Inline layouts are especially useful when the field label is the only label of a checkbox or switch; leave the control's own `label` unset in that case.

<preview path="./form-field/demos/FormFieldLayouts.vue" />

## Status Indicator

Toggle hint / warning / error individually and watch the icon shift severity and the popover stack content in priority order (hint → errors → warnings). Hover the icon, or click to pin.

<preview path="./form-field/demos/FormFieldStatusIndicator.vue" />

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

<preview path="./form-field/demos/FormFieldPasswordRules.vue" />

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

<preview path="./form-field/demos/FormFieldXofYRules.vue" />

The same pattern handles any aggregate constraint: "at least 2 tags selected", "between 5 and 50 items", "either email OR phone filled" — one extra rule with `whenFail: 'error'` does the gating.

::: tip Why the icon goes green at 3/4 (not orange)
The severity model picks the highest-severity item visible in the popover. With 3 ✓ and 1 ○ showing, success wins over pending — the icon goes green. The unfulfilled rule stays as ○ in the popover so the user can hover to see "could do more for strength", but the summary icon respects that validity is passing. See [Trigger-icon severity](#trigger-icon-severity) for the full priority order.
:::

## On-Submit Validation

The canonical on-submit-validation pattern: every required field starts clean, the user fills what they like, hits **Submit**, and any missing / invalid fields flip to the error state. The error icon appears in the label row, shifting the label-text right by `icon-width + gap` — a small horizontal nudge that catches the eye **without** any vertical row push that would move the Submit button or rearrange the form.

<preview path="./form-field/demos/FormFieldZeroShift.vue" />

The shift is the point. A reserved-slot approach (icon hidden via `visibility` to keep the label at a fixed offset) would be visually quieter but would also lose the cue — users wouldn't notice the state change. The icon-in-label-with-shift pattern strikes the balance: noticeable, but never disorienting.

## Grouping Controls

Use `CoarFormField` to add a group label and shared error to a set of checkboxes or radio buttons. Each checkbox keeps its own inline `label` prop for the option text.

<preview path="./form-field/demos/FormFieldCheckboxGroup.vue" />

## Registration Form

A complete registration form with submit-on-click validation. Errors only appear after the user attempts to submit.

<preview path="./form-field/demos/FormRegistration.vue" />

## Settings Panel

A settings page using every form control type — text inputs, textareas, selects, checkboxes, radio groups, and switches — all wrapped in `CoarFormField` for consistent layout.

<preview path="./form-field/demos/FormSettings.vue" />

## Validation with vee-validate

`CoarFormField` integrates seamlessly with [vee-validate](https://vee-validate.logaretm.com/) and [Zod](https://zod.dev/) schemas. Use `useField()` to get reactive `value` and `errorMessage` refs, then bind them to the input and `CoarFormField` respectively.

<preview path="./form-field/demos/FormVeeValidate.vue" />

::: tip Other validation libraries
`CoarFormField` is library-agnostic — it just takes an `error` string. Any validation approach works: vee-validate, vuelidate, or plain computed properties.
:::

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
