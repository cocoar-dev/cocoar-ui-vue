<script setup lang="ts">
/**
 * Internal panel rendered inside the `CoarFormField` status popover. Pulled
 * into its own component so the section layout (hint → errors → warnings,
 * each with its own severity icon) is testable without spinning up the
 * overlay service. `<CoarFormField>` mounts this via the popover's `#content`
 * slot.
 */
import CoarIcon from '../icon/CoarIcon.vue';
import type { CoarFormFieldRule } from './CoarFormField.vue';

defineProps<{
  hint: string;
  /**
   * Checklist rules (only the ones in checklist state — `whenPass='success'`
   * fulfilled or `whenFail='pending'` unfulfilled). `CoarFormField` already
   * partitioned the original rules by display destination; whenFail='error'
   * rules flow into `errors` and whenFail='warning' into `warnings`.
   */
  rules: readonly CoarFormFieldRule[];
  errors: readonly string[];
  warnings: readonly string[];
}>();
</script>

<template>
  <div class="coar-form-field__status-panel">
    <!-- One section per severity. Each section is `[icon] [stacked
         messages]`. Icon sits next to the FIRST message; additional
         messages flow left-aligned under it (not under the icon).
         Section icons match the main label icon's per-severity color
         so the popover reads as a legend for the trigger. -->
    <div
      v-if="hint"
      class="coar-form-field__status-section coar-form-field__status-section--hint"
    >
      <CoarIcon
        name="info"
        size="s"
        class="coar-form-field__status-section-icon"
        aria-hidden="true"
      />
      <div class="coar-form-field__status-section-body">
        <p>{{ hint }}</p>
      </div>
    </div>
    <!-- Rules section: per-item checklist, no section heading icon (each
         row carries its own state icon, so a heading icon would be noise).
         Sits between hint and errors — it's progress information, more
         actionable than hint but less urgent than an error. -->
    <ul
      v-if="rules.length > 0"
      class="coar-form-field__status-rules"
    >
      <li
        v-for="(rule, i) in rules"
        :key="`rule-${i}`"
        class="coar-form-field__status-rule"
        :class="{
          'coar-form-field__status-rule--fulfilled': rule.fulfilled,
        }"
      >
        <CoarIcon
          :name="rule.fulfilled ? 'check' : 'circle'"
          size="s"
          class="coar-form-field__status-rule-icon"
          aria-hidden="true"
        />
        <span class="coar-form-field__status-rule-label">{{ rule.label }}</span>
      </li>
    </ul>
    <div
      v-if="errors.length > 0"
      class="coar-form-field__status-section coar-form-field__status-section--error"
    >
      <CoarIcon
        name="circle-alert"
        size="s"
        class="coar-form-field__status-section-icon"
        aria-hidden="true"
      />
      <div class="coar-form-field__status-section-body">
        <p v-for="(msg, i) in errors" :key="`error-${i}`">{{ msg }}</p>
      </div>
    </div>
    <div
      v-if="warnings.length > 0"
      class="coar-form-field__status-section coar-form-field__status-section--warning"
    >
      <CoarIcon
        name="triangle-alert"
        size="s"
        class="coar-form-field__status-section-icon"
        aria-hidden="true"
      />
      <div class="coar-form-field__status-section-body">
        <p v-for="(msg, i) in warnings" :key="`warning-${i}`">{{ msg }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.coar-form-field__status-panel {
  display: flex;
  flex-direction: column;
  gap: var(--coar-spacing-m);
  max-width: 320px;
  padding: var(--coar-spacing-s);
  font-family: var(--coar-body-base-family);
  /* Match the label's size — the popover carries the DETAILED info; making
     it smaller than the label inverts the visual hierarchy (label was just
     a header; the detail is what the user is here to read). */
  font-size: var(--coar-component-m-label-font-size);
  line-height: 1.4;
}

/* Section row: icon left, stacked-message body to the right. `flex-start`
   on align-items keeps the icon next to the FIRST message line even when
   subsequent messages wrap or there are several. */
.coar-form-field__status-section {
  display: flex;
  align-items: flex-start;
  gap: var(--coar-spacing-s);
}
.coar-form-field__status-section-icon {
  flex-shrink: 0;
  /* Smaller nudge than the trigger icon: the popover body has a tighter
     line-height than the form label row, so the font-metric offset is
     less pronounced. 1px lands the icon visually on the cap-line of the
     first message. */
  transform: translateY(1px);
}
.coar-form-field__status-section--hint .coar-form-field__status-section-icon {
  color: var(--coar-text-neutral-tertiary);
}
.coar-form-field__status-section--error .coar-form-field__status-section-icon {
  color: var(--coar-text-semantic-error-bold);
}
.coar-form-field__status-section--warning .coar-form-field__status-section-icon {
  color: var(--coar-text-semantic-warning-bold);
}

.coar-form-field__status-section-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--coar-spacing-2xs, 2px);
}
.coar-form-field__status-section-body > p {
  margin: 0;
}
.coar-form-field__status-section--hint .coar-form-field__status-section-body {
  color: var(--coar-text-neutral-secondary);
}
.coar-form-field__status-section--error .coar-form-field__status-section-body {
  color: var(--coar-text-semantic-error-bold);
}
.coar-form-field__status-section--warning .coar-form-field__status-section-body {
  color: var(--coar-text-semantic-warning-bold);
}

/* Rules checklist — each item is `[icon] [label]`. Layout matches the other
   sections (8 px gap, icon on first text line) so the popover reads as a
   uniform stack of sections. */
.coar-form-field__status-rules {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--coar-spacing-xs);
}
.coar-form-field__status-rule {
  display: flex;
  align-items: flex-start;
  gap: var(--coar-spacing-s);
  /* Default state: unfulfilled — grey ring icon, grey text. */
  color: var(--coar-text-neutral-tertiary);
}
.coar-form-field__status-rule--fulfilled {
  color: var(--coar-text-semantic-success-bold);
}
.coar-form-field__status-rule-icon {
  flex-shrink: 0;
  transform: translateY(1px); /* same nudge as the section icons */
}
.coar-form-field__status-rule-label {
  flex: 1;
  min-width: 0;
}
</style>
