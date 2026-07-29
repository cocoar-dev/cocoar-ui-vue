<script setup lang="ts">
/**
 * `<CoarFormField>` — label + required-marker + inline field-status indicator
 * for the input components in this package.
 *
 * Status indicator: when ANY of `hint`, `warning`, or `error` is set, a single
 * icon appears in the label row. The icon is picked by severity:
 *
 *   - any error present  → red   `circle-alert`
 *   - else any warning   → orange `triangle-alert`
 *   - else hint set      → grey  `info`
 *   - else               → no icon at all
 *
 * The icon is conditionally rendered, so the label-text shifts right by
 * `icon-width + gap` when it appears — that small horizontal nudge is the
 * attention signal. The form's vertical geometry is unaffected (no row
 * appears below the input, the Submit button doesn't move).
 *
 * Hover (or focus) the icon to open a popover with everything that's set:
 * hint section first (grey), then errors (red list), then warnings (orange
 * list). Click the icon to pin the popover open; click outside or press
 * Escape to close. Implemented with `<CoarPopover mode="both">`.
 *
 * A11y:
 *   - one `role="alert"` SR-only span per error (announced on appearance)
 *   - one SR-only span per warning + one for the hint (no alert role)
 *   - `aria-describedby` on child inputs picks up the space-separated IDs
 *     via `FORM_FIELD_INJECTION_KEY.messageId`
 *   - child inputs flip to `aria-invalid="true"` + their error border via
 *     `FORM_FIELD_INJECTION_KEY.hasError` (errors only — warnings don't
 *     mark the input as invalid)
 */
import { computed, provide, useId } from 'vue';
import CoarIcon from '../icon/CoarIcon.vue';
import CoarPopover from '../popover/CoarPopover.vue';
import CoarFormFieldStatusPanel from './CoarFormFieldStatusPanel.vue';
import { FORM_FIELD_INJECTION_KEY } from './constants';

/**
 * What `CoarFormFieldRule` renders when the rule's `fulfilled` flag is `true`:
 *
 *   - `'success'` — show as a green ✓ row in the popover checklist (the
 *     default; matches the password-checklist UX where fulfilling a rule is
 *     visible progress).
 *   - `'hide'` — don't render the rule at all. Use for live-validation rules
 *     whose natural state is "fine" — there's no need to celebrate.
 */
export type CoarFormFieldRulePassMode = 'success' | 'hide';

/**
 * What `CoarFormFieldRule` renders when the rule's `fulfilled` flag is `false`:
 *
 *   - `'pending'` — show as a grey ○ row in the popover checklist (the
 *     default; the rule contributes to the orange "in-progress" trigger
 *     icon when `rulesTouched`, or the grey "click-me-to-explore" hint when
 *     untouched).
 *   - `'warning'` — promote into the popover's Warnings section with the
 *     orange `triangle-alert` icon. Fires immediately, no `rulesTouched` gating.
 *   - `'error'` — promote into the popover's Errors section with the red
 *     `circle-alert` icon. Also drives `aria-invalid="true"` on the child
 *     input (the rule is a hard requirement). Fires immediately.
 *   - `'hide'` — don't render the rule even when unfulfilled. Useful when
 *     the rule's `label` is only meaningful in the fulfilled state.
 */
export type CoarFormFieldRuleFailMode = 'pending' | 'warning' | 'error' | 'hide';

export type CoarFormFieldLayout = 'stacked' | 'inline';
export type CoarFormFieldLabelPosition = 'before' | 'after';

/**
 * A single live-validation rule. Pass an array of these to
 * `CoarFormField.rules` — Vue's reactivity re-evaluates `fulfilled` on every
 * render so the consumer just writes `text.length <= 20` inline.
 *
 * `whenPass` / `whenFail` are both optional; their defaults give the
 * password-checklist UX (`whenPass: 'success'`, `whenFail: 'pending'`). For
 * live max-length / format checks, use `whenPass: 'hide'` +
 * `whenFail: 'error'`.
 */
export interface CoarFormFieldRule {
  /** The user-facing message. Shown in the popover and read by SRs. */
  label: string;
  /**
   * Whether the rule is currently satisfied. Plain boolean — Vue tracks the
   * reactive deps of the expression you write (`text.length >= 8`) and
   * re-evaluates per render. No `() => boolean` needed.
   */
  fulfilled: boolean;
  /** What to render when `fulfilled` is `true`. Default `'success'`. */
  whenPass?: CoarFormFieldRulePassMode;
  /** What to render when `fulfilled` is `false`. Default `'pending'`. */
  whenFail?: CoarFormFieldRuleFailMode;
}

export interface CoarFormFieldProps {
  /** Visible label text. */
  label?: string;
  /**
   * Informational help text. Sits at the top of the popover (grey). When
   * it's the only thing set, the icon is a grey `info` glyph.
   */
  hint?: string;
  /**
   * Validation errors. A single string is treated as one error; an array
   * lets you surface multiple at once (e.g. "min 8 chars" AND "needs an
   * uppercase letter"). When non-empty, the icon goes red, the input gets
   * `aria-invalid="true"` + the error border, and each error is announced
   * as a `role="alert"`.
   */
  error?: string | readonly string[];
  /**
   * Non-blocking warnings. Same shape as `error` but lower severity — the
   * input stays valid, the icon is orange (only if no error is also set),
   * and no `role="alert"` is fired (warnings shouldn't interrupt SR users).
   */
  warning?: string | readonly string[];
  /**
   * Live-validation rules. Each rule declares what to render in two states
   * via `whenPass` / `whenFail`:
   *
   *   - **Password-checklist** (defaults): `whenPass: 'success'` shows ✓
   *     green in the popover checklist; `whenFail: 'pending'` shows ○ grey.
   *     Severity contribution: orange (when touched) or grey-info (untouched).
   *   - **Live max-length / format errors**: `whenPass: 'hide'` hides when
   *     satisfied; `whenFail: 'error'` shows as red error + drives
   *     `aria-invalid="true"` on the child input.
   *   - **Live advisories**: `whenPass: 'hide'`, `whenFail: 'warning'` —
   *     hides when fine, shows orange warning when not.
   *   - **Hard requirement with progress tick**: `whenPass: 'success'`,
   *     `whenFail: 'error'` — visible checklist item AND blocks submit.
   *
   * `fulfilled` is a plain boolean — the consumer writes the expression
   * inline (`text.length <= 20`) or in a `computed`, and Vue's reactivity
   * re-evaluates whenever the bound state changes. No `() => boolean`
   * needed.
   *
   * For confirm-password matching, add a rule:
   *   `{ label: 'Passwords match', fulfilled: pw === confirm }`
   */
  rules?: readonly CoarFormFieldRule[];
  /** Show required indicator (*) next to label. */
  required?: boolean;
  /** Disabled state — propagated to child inputs via injection. */
  disabled?: boolean;
  /** Explicit input ID (auto-generated if omitted). */
  id?: string;
  /** Places label and control vertically (`stacked`) or on one row (`inline`). */
  layout?: CoarFormFieldLayout;
  /** Places the complete label/status cluster before or after the control. */
  labelPosition?: CoarFormFieldLabelPosition;
}

const props = withDefaults(defineProps<CoarFormFieldProps>(), {
  label: undefined,
  hint: '',
  // Defaults are strings (not `() => []`) so eslint's
  // `vue/require-valid-default-prop` matches the first type in the union.
  // `toList('')` still normalizes to `[]` at the consumer-facing edge.
  error: '',
  warning: '',
  rules: () => [],
  required: false,
  disabled: false,
  id: undefined,
  layout: 'stacked',
  labelPosition: 'before',
});

const autoId = `coar-field-${useId()}`;
const inputId = computed(() => props.id || autoId);
const labelId = computed(() => `${inputId.value}-label`);
const hintId = computed(() => `${inputId.value}-hint`);

/** Normalize `string | string[] | undefined` to a clean string[]. */
const toList = (v: string | readonly string[] | undefined): string[] => {
  if (v == null) return [];
  if (typeof v === 'string') return v.length > 0 ? [v] : [];
  return v.filter((s) => s.length > 0);
};
const stringErrors = computed(() => toList(props.error));
const stringWarnings = computed(() => toList(props.warning));

// Partition rules by display destination. Each rule's `whenPass` /
// `whenFail` decide whether it shows in the checklist, the errors section,
// the warnings section, or is hidden in its current state.
const ruleErrorLabels = computed(() =>
  props.rules.filter((r) => !r.fulfilled && r.whenFail === 'error').map((r) => r.label),
);
const ruleWarningLabels = computed(() =>
  props.rules.filter((r) => !r.fulfilled && r.whenFail === 'warning').map((r) => r.label),
);
/**
 * Rules visible in the popover checklist. A rule appears here when:
 *   - fulfilled + `whenPass: 'success'` (default) → ✓ green row
 *   - unfulfilled + `whenFail: 'pending'` (default) → ○ grey row
 * Hidden in their current state: `whenPass: 'hide'` (when fulfilled) or
 * `whenFail: 'error'/'warning'/'hide'` (when unfulfilled — those promote
 * to the dedicated error/warning sections instead).
 */
const checklistRules = computed(() =>
  props.rules.filter((r) => {
    if (r.fulfilled) return (r.whenPass ?? 'success') === 'success';
    return (r.whenFail ?? 'pending') === 'pending';
  }),
);

// Combine string-form props with rule-driven entries so the panel just
// receives flat string arrays for the errors + warnings sections.
const errors = computed(() => [...stringErrors.value, ...ruleErrorLabels.value]);
const warnings = computed(() => [...stringWarnings.value, ...ruleWarningLabels.value]);

const hasError = computed(() => errors.value.length > 0);
const hasWarning = computed(() => warnings.value.length > 0);
const hasHint = computed(() => props.hint.length > 0);
const hasAnyStatus = computed(
  () => hasError.value || hasWarning.value || hasHint.value || checklistRules.value.length > 0,
);

/**
 * Severity selects the icon + color. The model is "severity of what's
 * visible in the popover" — pick the highest-severity section that has at
 * least one item.
 *
 *   1. popover has ≥1 entry in the Errors section → red `circle-alert`
 *   2. else popover has ≥1 entry in the Warnings section → orange `triangle-alert`
 *   3. else popover has ≥1 success item (rule with `whenPass: 'success'`
 *      currently fulfilled) → green `check-circle-2`
 *   4. else popover has ≥1 pending checklist item OR a hint → grey `info`
 *   5. else → no icon
 *
 * Note that success **wins over** pending — once the user has fulfilled any
 * rule, the icon goes green (positive reinforcement). The pending rules
 * still appear as ○ in the popover so the user can hover for the "could do
 * more" detail; the icon just doesn't shout orange about it. For
 * "must-do" rules use `whenFail: 'error'` — pending is for genuinely
 * optional progress (part of an X-of-Y, polish-up rules, etc.).
 */
type Severity = 'error' | 'warning' | 'success' | 'hint' | 'none';
const popoverHasSuccessItem = computed(() =>
  checklistRules.value.some((r) => r.fulfilled && (r.whenPass ?? 'success') === 'success'),
);
const popoverHasPendingItem = computed(() =>
  checklistRules.value.some((r) => !r.fulfilled && (r.whenFail ?? 'pending') === 'pending'),
);
const severity = computed<Severity>(() => {
  if (hasError.value) return 'error';
  if (hasWarning.value) return 'warning';
  if (popoverHasSuccessItem.value) return 'success';
  if (popoverHasPendingItem.value || hasHint.value) return 'hint';
  return 'none';
});

const iconName = computed(() => {
  switch (severity.value) {
    case 'error':
      return 'circle-alert';
    case 'warning':
      return 'triangle-alert';
    case 'success':
      return 'check-circle-2';
    case 'hint':
      return 'info';
    default:
      return '';
  }
});

// Per-message IDs let SRs read each item independently and the input's
// aria-describedby reference all of them at once.
const errorIds = computed(() => errors.value.map((_, i) => `${inputId.value}-error-${i}`));
const warningIds = computed(() => warnings.value.map((_, i) => `${inputId.value}-warning-${i}`));
const messageId = computed(() => {
  const ids: string[] = [];
  if (hasHint.value) ids.push(hintId.value);
  ids.push(...errorIds.value, ...warningIds.value);
  return ids.join(' ');
});

provide(FORM_FIELD_INJECTION_KEY, {
  inputId,
  labelId,
  messageId,
  hasError,
  disabled: computed(() => props.disabled),
});
</script>

<template>
  <div
    class="coar-form-field"
    :class="[
      `coar-form-field--${layout}`,
      `coar-form-field--label-${labelPosition}`,
      { 'coar-form-field--disabled': disabled },
    ]"
  >
    <div class="coar-form-field__body">
      <div v-if="label" class="coar-form-field__label-cluster">
        <!-- Keep the popover trigger outside the native label. Opening help
             must never toggle a checkbox, switch, or radio control. -->
        <CoarPopover
          v-if="hasAnyStatus && labelPosition === 'before'"
          mode="both"
          :offset="6"
          class="coar-form-field__status-popover"
        >
          <CoarIcon
            :name="iconName"
            size="s"
            class="coar-form-field__status-icon"
            :class="`coar-form-field__status-icon--${severity}`"
            aria-hidden="true"
          />
          <template #content>
            <CoarFormFieldStatusPanel
              :hint="hint"
              :rules="checklistRules"
              :errors="errors"
              :warnings="warnings"
            />
          </template>
        </CoarPopover>

        <label :id="labelId" :for="inputId" class="coar-form-field__label">
          <span class="coar-form-field__label-text">{{ label }}</span>
          <span v-if="required" class="coar-form-field__required" aria-hidden="true">*</span>
        </label>

        <CoarPopover
          v-if="hasAnyStatus && labelPosition === 'after'"
          mode="both"
          :offset="6"
          class="coar-form-field__status-popover"
        >
          <CoarIcon
            :name="iconName"
            size="s"
            class="coar-form-field__status-icon"
            :class="`coar-form-field__status-icon--${severity}`"
            aria-hidden="true"
          />
          <template #content>
            <CoarFormFieldStatusPanel
              :hint="hint"
              :rules="checklistRules"
              :errors="errors"
              :warnings="warnings"
            />
          </template>
        </CoarPopover>
      </div>

      <div class="coar-form-field__control">
        <slot />
      </div>
    </div>

    <!-- SR-only spans — one per piece. Carry the IDs that the child input's
         `aria-describedby` references. Errors are wrapped in role="alert" so
         they're announced when they appear; warnings + hint are silent
         (they're descriptive, not urgent). -->
    <span v-if="hasHint" :id="hintId" class="coar-form-field__sr-only">{{ hint }}</span>
    <span
      v-for="(msg, i) in errors"
      :id="errorIds[i]"
      :key="`error-sr-${i}`"
      class="coar-form-field__sr-only"
      role="alert"
      >{{ msg }}</span
    >
    <span
      v-for="(msg, i) in warnings"
      :id="warningIds[i]"
      :key="`warning-sr-${i}`"
      class="coar-form-field__sr-only"
      >{{ msg }}</span
    >
  </div>
</template>

<style scoped>
.coar-form-field {
  display: block;
}

.coar-form-field__body {
  display: flex;
}

.coar-form-field--stacked .coar-form-field__body {
  flex-direction: column;
}

.coar-form-field--inline .coar-form-field__body {
  align-items: center;
  gap: var(--coar-spacing-s);
}

.coar-form-field--stacked.coar-form-field--label-after .coar-form-field__body {
  flex-direction: column-reverse;
}

.coar-form-field--inline.coar-form-field--label-after .coar-form-field__body {
  flex-direction: row-reverse;
  justify-content: flex-end;
}

.coar-form-field--disabled {
  opacity: 0.6;
  pointer-events: none;
}

.coar-form-field__label-cluster,
.coar-form-field__label {
  display: inline-flex;
  align-items: center;
  gap: var(--coar-spacing-xs);
}

.coar-form-field__label {
  font-family: var(--coar-body-base-family);
  /* Form labels are "medium component label" size (14px) — distinct from
     caption-size (12px) which lives in tags / badges / dropdown footnotes.
     Same token-class the inputs themselves use, so label+input stay in
     visual sync regardless of how the component-size scale gets retuned. */
  font-size: var(--coar-component-m-label-font-size);
  font-weight: var(--coar-font-weight-medium);
  color: var(--coar-text-neutral-primary);
  cursor: pointer;
  user-select: none;
}

/* The popover wrapper is inline-flex so its trigger doesn't push the label
   onto its own baseline. The icon inside carries the visible color. */
.coar-form-field__status-popover {
  display: inline-flex;
  align-items: center;
}

.coar-form-field__status-icon {
  cursor: help;
  flex-shrink: 0;
  /* Poppins/Inter have visibly more line-box space above the cap height than
     below the baseline. Aligning the SVG's geometric box to the line box
     therefore makes it look too high; this optical correction keeps glyph
     and label centered in both stacked and inline layouts. */
  transform: translateY(3px);
}
.coar-form-field__status-icon--error {
  color: var(--coar-text-semantic-error-bold);
}
.coar-form-field__status-icon--warning {
  color: var(--coar-text-semantic-warning-bold);
}
.coar-form-field__status-icon--success {
  color: var(--coar-text-semantic-success-bold);
}
.coar-form-field__status-icon--hint {
  color: var(--coar-text-neutral-tertiary);
}

.coar-form-field__required {
  color: var(--coar-text-semantic-error-bold);
}

/* Popover panel styles live in `CoarFormFieldStatusPanel.vue` — the panel is
   teleported by the overlay service and rendered outside this component's
   scoped-CSS tree, so its rules need their own scope to apply. */

/* WCAG-compliant visually-hidden helper. Keeps text in the a11y tree (so
   `aria-describedby` resolves) without painting it. */
.coar-form-field__sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
