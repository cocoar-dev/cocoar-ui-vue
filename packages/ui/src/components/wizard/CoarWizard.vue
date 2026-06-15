<script setup lang="ts">
/**
 * `<CoarWizard>` — a multi-step flow shell, built to live inside a modal (it
 * renders no modal of its own). Three things make it a wizard rather than a
 * plain stepper:
 *
 *  1. **Animated body resize.** Only the active step's content is mounted, and
 *     the body smoothly animates its height between steps — so a modal wrapping
 *     it grows / shrinks to fit each page.
 *  2. **A scrollable step indicator that follows you.** The indicator can be far
 *     larger than the modal; it scrolls (horizontally for `top`/`bottom`,
 *     vertically for `left`/`right`) and auto-centers the active step on every
 *     move.
 *  3. **Edge-placeable indicator.** `indicatorPosition` puts the progress strip
 *     on any of the four edges.
 *
 * Content goes in a slot named after each step's `id`; only the active one is
 * rendered. Built-in Back / Next / Finish footer (overridable via `#footer`).
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import CoarButton from '../button/CoarButton.vue';
import CoarIcon from '../icon/CoarIcon.vue';

export interface CoarWizardStep {
  /** Stable id — also the name of the content slot for this step. */
  id: string;
  /** Visible label in the indicator. */
  label: string;
  /** Optional second line under the label. */
  description?: string;
  /** Shown muted + marked "optional" in the indicator. */
  optional?: boolean;
  /** When `false`, the built-in Next button is disabled on this step (gate). */
  canAdvance?: boolean;
  /** Prevents navigating to this step from the indicator. */
  disabled?: boolean;
}

export type WizardIndicatorPosition = 'top' | 'right' | 'bottom' | 'left';

export interface CoarWizardProps {
  /** Ordered steps. Each `id` is the name of that step's content slot. */
  steps: CoarWizardStep[];
  /** Which edge the step indicator sits on. */
  indicatorPosition?: WizardIndicatorPosition;
  /** Allow jumping to any (non-disabled) step from the indicator, not just
   *  completed ones. Default linear (only completed steps are clickable). */
  freeNavigation?: boolean;
  /** Hide the built-in Back / Next / Finish footer. */
  hideFooter?: boolean;
  /** Skip the body height + content transition (also auto-skipped under
   *  `prefers-reduced-motion`). */
  disableAnimation?: boolean;
  backLabel?: string;
  nextLabel?: string;
  finishLabel?: string;
}

const props = withDefaults(defineProps<CoarWizardProps>(), {
  indicatorPosition: 'top',
  freeNavigation: false,
  hideFooter: false,
  disableAnimation: false,
  backLabel: 'Back',
  nextLabel: 'Next',
  finishLabel: 'Finish',
});

/** Two-way bound active step id. Uncontrolled (defaults to the first step) when
 *  `v-model:step` is not provided. */
const stepModel = defineModel<string | undefined>('step', { default: undefined });

const emit = defineEmits<{
  /** Fired when Next is pressed on the last step. */
  finish: [];
  /** Fired whenever the active step changes. */
  'step-change': [id: string, index: number];
}>();

const rootEl = ref<HTMLElement | null>(null);
const indicatorEl = ref<HTMLElement | null>(null);
const bodyEl = ref<HTMLElement | null>(null);
const contentEl = ref<HTMLElement | null>(null);

const isVertical = computed(
  () => props.indicatorPosition === 'left' || props.indicatorPosition === 'right',
);

const activeIndex = computed(() => {
  const i = props.steps.findIndex((s) => s.id === stepModel.value);
  return i >= 0 ? i : 0;
});
const activeStep = computed<CoarWizardStep | undefined>(() => props.steps[activeIndex.value]);
const activeId = computed(() => activeStep.value?.id ?? '');
const isFirst = computed(() => activeIndex.value <= 0);
const isLast = computed(() => activeIndex.value >= props.steps.length - 1);
const canAdvance = computed(() => activeStep.value?.canAdvance !== false);

function goTo(id: string) {
  const idx = props.steps.findIndex((s) => s.id === id);
  if (idx < 0 || idx === activeIndex.value) return;
  if (props.steps[idx]?.disabled) return;
  stepModel.value = id;
  emit('step-change', id, idx);
}
function next() {
  if (!canAdvance.value) return;
  if (isLast.value) {
    emit('finish');
    return;
  }
  goTo(props.steps[activeIndex.value + 1]!.id);
}
function back() {
  if (isFirst.value) return;
  goTo(props.steps[activeIndex.value - 1]!.id);
}
function indicatorClickable(idx: number): boolean {
  if (idx === activeIndex.value) return false; // current step — clicking does nothing
  if (props.steps[idx]?.disabled) return false;
  if (props.freeNavigation) return true;
  return idx < activeIndex.value; // completed steps
}
function stepStateClass(idx: number) {
  return {
    'coar-wizard__step--done': idx < activeIndex.value,
    'coar-wizard__step--active': idx === activeIndex.value,
    'coar-wizard__step--upcoming': idx > activeIndex.value,
    'coar-wizard__step--optional': props.steps[idx]?.optional === true,
    'coar-wizard__step--clickable': indicatorClickable(idx),
  };
}

const footerSlotProps = computed(() => ({
  next,
  back,
  goTo,
  isFirst: isFirst.value,
  isLast: isLast.value,
  canAdvance: canAdvance.value,
  activeStep: activeStep.value,
  activeIndex: activeIndex.value,
}));

/* ── Auto-scroll the active step into view ─────────────────────────────── */

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function scrollActiveIntoView(smooth: boolean) {
  const container = indicatorEl.value;
  if (!container) return;
  const el = container.querySelector<HTMLElement>(`[data-step-index="${activeIndex.value}"]`);
  if (!el) return;
  const behavior: ScrollBehavior = smooth && !prefersReducedMotion() ? 'smooth' : 'auto';
  if (isVertical.value) {
    const target = el.offsetTop - (container.clientHeight - el.offsetHeight) / 2;
    const max = container.scrollHeight - container.clientHeight;
    container.scrollTo({ top: Math.max(0, Math.min(target, max)), behavior });
  } else {
    const target = el.offsetLeft - (container.clientWidth - el.offsetWidth) / 2;
    const max = container.scrollWidth - container.clientWidth;
    container.scrollTo({ left: Math.max(0, Math.min(target, max)), behavior });
  }
}

/* ── Animate the body height between steps ─────────────────────────────── */

let raf1 = 0;
let raf2 = 0;

function clearRaf() {
  cancelAnimationFrame(raf1);
  cancelAnimationFrame(raf2);
}

function onBodyTransitionEnd(e: TransitionEvent) {
  if (e.propertyName !== 'height' || e.target !== bodyEl.value) return;
  const body = bodyEl.value;
  if (!body) return;
  // Release to auto height so dynamic content (async loads, validation rows)
  // can still grow the step after the transition.
  body.style.transition = '';
  body.style.height = '';
  body.style.overflow = '';
}

// flush: 'pre' (default) — runs BEFORE the DOM patches, so we can read the
// outgoing step's height before the content swaps.
watch(activeIndex, () => {
  const body = bodyEl.value;
  if (!body || props.disableAnimation || prefersReducedMotion()) {
    nextTick(() => scrollActiveIntoView(true));
    return;
  }
  const from = body.offsetHeight;
  body.style.transition = '';
  body.style.overflow = 'hidden';
  body.style.height = `${from}px`;

  nextTick(() => {
    // Content has swapped; the keyed `contentEl` is the new step. Its own
    // height is unconstrained (the body clips), so it reports the natural target.
    const to = contentEl.value?.offsetHeight ?? from;
    clearRaf();
    // Double rAF: lock `from`, then transition to `to` on the next frame.
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        body.style.transition = 'height var(--coar-wizard-anim-duration, 260ms) var(--coar-wizard-anim-ease, ease)';
        body.style.height = `${to}px`;
      });
    });
    scrollActiveIntoView(true);
  });
});

onMounted(() => scrollActiveIntoView(false));
onBeforeUnmount(clearRaf);

defineExpose({ next, back, goTo });
</script>

<template>
  <div
    ref="rootEl"
    class="coar-wizard"
    :class="[`coar-wizard--indicator-${indicatorPosition}`, { 'coar-wizard--vertical': isVertical }]"
  >
    <!-- Step indicator (scrollable, auto-centers the active step) -->
    <div ref="indicatorEl" class="coar-wizard__indicator">
      <ol class="coar-wizard__steps">
        <li
          v-for="(s, i) in steps"
          :key="s.id"
          class="coar-wizard__step"
          :class="stepStateClass(i)"
          :data-step-index="i"
        >
          <button
            type="button"
            class="coar-wizard__step-btn"
            :disabled="!indicatorClickable(i) && i !== activeIndex"
            :aria-current="i === activeIndex ? 'step' : undefined"
            @click="goTo(s.id)"
          >
            <span class="coar-wizard__marker">
              <CoarIcon v-if="i < activeIndex" name="check" size="xs" />
              <template v-else>{{ i + 1 }}</template>
            </span>
            <span class="coar-wizard__step-text">
              <span class="coar-wizard__step-label">{{ s.label }}</span>
              <span v-if="s.description" class="coar-wizard__step-desc">{{ s.description }}</span>
            </span>
          </button>
        </li>
      </ol>
    </div>

    <!-- Main column: animated content body + footer -->
    <div class="coar-wizard__main">
      <div ref="bodyEl" class="coar-wizard__body" @transitionend="onBodyTransitionEnd">
        <div :key="activeId" ref="contentEl" class="coar-wizard__content">
          <slot :name="activeId" :step="activeStep" :index="activeIndex" />
        </div>
      </div>

      <div v-if="!hideFooter" class="coar-wizard__footer">
        <slot name="footer" v-bind="footerSlotProps">
          <CoarButton variant="tertiary" :disabled="isFirst" @click="back">{{ backLabel }}</CoarButton>
          <span class="coar-wizard__footer-spacer" />
          <CoarButton variant="primary" :disabled="!canAdvance" @click="next">
            {{ isLast ? finishLabel : nextLabel }}
          </CoarButton>
        </slot>
      </div>
    </div>
  </div>
</template>

<style>
.coar-wizard {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  gap: var(--coar-spacing-m, 1rem);
}
.coar-wizard--indicator-bottom { flex-direction: column-reverse; }
.coar-wizard--indicator-left { flex-direction: row; }
.coar-wizard--indicator-right { flex-direction: row-reverse; }

.coar-wizard__main {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
}

/* ── Indicator ─────────────────────────────────────────────────────────── */
.coar-wizard__indicator {
  flex-shrink: 0;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
}
.coar-wizard--vertical .coar-wizard__indicator {
  overflow-x: hidden;
  overflow-y: auto;
  align-self: stretch;
}

/* Thin, subtle scrollbar for the indicator track. */
.coar-wizard__indicator::-webkit-scrollbar { height: 6px; width: 6px; }
.coar-wizard__indicator::-webkit-scrollbar-thumb {
  background: var(--coar-border-neutral, #d6d6d6);
  border-radius: 3px;
}
.coar-wizard__indicator::-webkit-scrollbar-track { background: transparent; }

.coar-wizard .coar-wizard__steps {
  list-style: none;
  margin: 0;
  padding: var(--coar-spacing-xs, 0.25rem);
  display: flex;
  gap: 0;
  min-width: max-content;
  /* Top-align (horizontal) / start-align (vertical) so a step with a
     `description` grows downward only — every marker stays on one line
     regardless of which steps carry a second text line. */
  align-items: flex-start;
}
.coar-wizard--vertical .coar-wizard__steps {
  flex-direction: column;
  min-width: 0;
}

.coar-wizard .coar-wizard__step {
  position: relative;
  flex: 0 0 auto;
  display: flex;
  /* Reset any host list styling (e.g. VitePress prose `li + li` margins, or an
     app's global list rules) — the `.coar-wizard` prefix raises specificity so
     the reset wins, keeping every marker on one line wherever it's embedded. */
  margin: 0;
  padding: 0;
}

.coar-wizard__step-btn {
  appearance: none;
  border: none;
  background: transparent;
  font: inherit;
  color: inherit;
  cursor: default;
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-s, 0.5rem);
  padding: var(--coar-spacing-s, 0.5rem) var(--coar-spacing-m, 1rem);
  border-radius: var(--coar-radius-m, 0.375rem);
}
/* Horizontal indicator: marker stacked above the label, centred. */
.coar-wizard:not(.coar-wizard--vertical) .coar-wizard__step-btn {
  flex-direction: column;
  gap: var(--coar-spacing-xs, 0.25rem);
  text-align: center;
}
/* Vertical indicator: marker beside the label, with a sensible min width so
   the connector spacing is even. */
.coar-wizard--vertical .coar-wizard__step-btn { min-width: 9rem; }

.coar-wizard__step--clickable .coar-wizard__step-btn { cursor: pointer; }
/* Subtle hover: a soft accent halo around the marker + a darker label — no
   blocky full-button background. */
.coar-wizard__step--clickable .coar-wizard__step-btn:hover .coar-wizard__marker {
  box-shadow: 0 0 0 4px var(--coar-background-accent-tertiary, rgba(37, 99, 235, 0.12));
}
.coar-wizard__step--clickable .coar-wizard__step-btn:hover .coar-wizard__step-label {
  color: var(--coar-text-neutral-primary, #1a1a1a);
}
/* Keyboard focus stays clearly visible (ring on the marker). */
.coar-wizard__step-btn:focus-visible { outline: none; }
.coar-wizard__step-btn:focus-visible .coar-wizard__marker {
  box-shadow: 0 0 0 3px var(--coar-border-accent, var(--coar-text-accent-primary, #2563eb));
}

/* Connector line between adjacent markers (centre-to-centre, clipped to the
   marker edges so it never draws over a marker). */
.coar-wizard__step:not(:last-child)::after {
  content: '';
  position: absolute;
  background: var(--coar-border-neutral, #e0e0e0);
}
.coar-wizard:not(.coar-wizard--vertical) .coar-wizard__step:not(:last-child)::after {
  top: calc(var(--coar-spacing-s, 0.5rem) + var(--coar-wizard-marker-size, 1.75rem) / 2 - 1px);
  left: calc(50% + var(--coar-wizard-marker-size, 1.75rem) / 2 + 0.3rem);
  right: calc(-50% + var(--coar-wizard-marker-size, 1.75rem) / 2 + 0.3rem);
  height: 2px;
}
.coar-wizard--vertical .coar-wizard__step:not(:last-child)::after {
  left: calc(var(--coar-spacing-m, 1rem) + var(--coar-wizard-marker-size, 1.75rem) / 2 - 1px);
  top: calc(var(--coar-spacing-s, 0.5rem) + var(--coar-wizard-marker-size, 1.75rem) + 0.25rem);
  bottom: -0.25rem;
  width: 2px;
}
.coar-wizard__step--done:not(:last-child)::after {
  background: var(--coar-background-accent-primary, var(--coar-text-accent-primary, #2563eb));
}

.coar-wizard__marker {
  flex-shrink: 0;
  width: var(--coar-wizard-marker-size, 1.75rem);
  height: var(--coar-wizard-marker-size, 1.75rem);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 2px solid var(--coar-border-neutral, #d6d6d6);
  background: var(--coar-background-neutral-primary, #fff);
  color: var(--coar-text-neutral-tertiary, #9a9a9a);
  font-size: var(--coar-font-size-s, 0.875rem);
  font-weight: var(--coar-font-weight-semibold, 600);
  line-height: 1;
  transition: background 0.2s, border-color 0.2s, color 0.2s, box-shadow 0.2s;
}
.coar-wizard__step--active .coar-wizard__marker {
  border-color: var(--coar-background-accent-primary, var(--coar-text-accent-primary, #2563eb));
  color: var(--coar-background-accent-primary, var(--coar-text-accent-primary, #2563eb));
  box-shadow: 0 0 0 4px var(--coar-background-accent-tertiary, rgba(37, 99, 235, 0.12));
}
.coar-wizard__step--done .coar-wizard__marker {
  border-color: var(--coar-background-accent-primary, var(--coar-text-accent-primary, #2563eb));
  background: var(--coar-background-accent-primary, var(--coar-text-accent-primary, #2563eb));
  color: var(--coar-text-on-accent, #fff);
}

.coar-wizard__step-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.coar-wizard--vertical .coar-wizard__step-text { text-align: left; }
.coar-wizard__step-label {
  font-size: var(--coar-font-size-s, 0.875rem);
  font-weight: var(--coar-font-weight-medium, 500);
  color: var(--coar-text-neutral-secondary, #555);
}
.coar-wizard__step--active .coar-wizard__step-label {
  color: var(--coar-text-neutral-primary, #1a1a1a);
}
.coar-wizard__step-desc {
  font-size: var(--coar-font-size-xs, 0.75rem);
  color: var(--coar-text-neutral-tertiary, #9a9a9a);
}

/* ── Body (animated height) ────────────────────────────────────────────── */
.coar-wizard__body {
  flex: 1 1 auto;
  min-height: 0;
}
.coar-wizard__content {
  animation: coar-wizard-step-in var(--coar-wizard-anim-duration, 260ms) var(--coar-wizard-anim-ease, ease);
}
@keyframes coar-wizard-step-in {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  .coar-wizard__content { animation: none; }
}

/* ── Footer ────────────────────────────────────────────────────────────── */
.coar-wizard__footer {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-s, 0.5rem);
  margin-top: var(--coar-spacing-m, 1rem);
}
.coar-wizard__footer-spacer { flex: 1 1 auto; }
</style>
