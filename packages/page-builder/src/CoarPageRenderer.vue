<script setup lang="ts">
import { computed, nextTick, provide, ref, toRaw, watch } from 'vue';
import { useI18n } from '@cocoar/vue-localization';
import { isElementAllowed } from './schema';
import type { ButtonNode, ElementNode, PageNode, PageConfig, PageRootNode } from './schema';
import { useMergedElements } from './elements/useMergedElements';
import type { PageElementDefinition } from './elements/registry';
import { migrateLegacyTypes } from './builder/schemaNormalize';
import {
  migrateV1PropsBag,
  migrateLegacyPasswordInput,
  healMissingPropsBags,
} from './builder/schemaMigrateV1';
import {
  FORM_ERROR_KEY,
  PAGE_RENDERER_KEY,
  type ActionHandler,
  type ActionValues,
  type CustomValidator,
  type PageRendererContext,
} from './context';
import { CoarNote } from '@cocoar/vue-ui';
import { compilePagePattern, isValidEmail, isUnsafeFieldName } from './renderSafety';
import PageNode_ from './PageNode.vue';

const props = defineProps<{
  schema: PageNode
  actions?: Record<string, ActionHandler>
  /**
   * Developer-only: async or complex cross-field validation that cannot be
   * expressed declaratively. Returns fieldName → error message.
   * Not exposed in the builder UI — tenant-facing rules live in the schema.
   */
  onValidate?: CustomValidator
  assetResolver?: (id: string) => string
  /**
   * Security/allowlist config. Disallowed element types are skipped at render
   * time even if they appear in the schema — this is the security boundary
   * for hand-written or tampered-with JSON.
   */
  config?: PageConfig
  /**
   * Host-supplied field values for edit-form scenarios, merged OVER the
   * schema's `defaultValue`s on init. Only keys that match a NAMED input in
   * the (allowed) tree are taken — stray host data never leaks into the
   * action payload. Replacing the object re-initializes the form, like a
   * schema change.
   */
  initialValues?: ActionValues
}>();

const emit = defineEmits<{
  /**
   * Fires whenever the value model changes — field edits, (re-)initialization
   * and `reset()`. Carries a snapshot copy, safe for the host to keep;
   * unlocks autosave, drafts and dirty tracking.
   */
  'update:values': [values: ActionValues];
}>();

const { t } = useI18n();

// ─── State ────────────────────────────────────────────────────────────────────

const values = ref<ActionValues>({});
const touched = ref<Record<string, boolean>>({});
/** Field errors from the submit-time `onValidate` — cleared per field on edit. */
const asyncErrors = ref<Record<string, string>>({});
const isValidating = ref(false);
const isSubmitting = ref(false);
/** Action id whose trigger is in flight (validate + action phase) — drives the button spinner. */
const pendingAction = ref<string | null>(null);
/** Form-level error (`_form` from onValidate, or an action rejection) — the banner. */
const formError = ref('');

/**
 * Legacy `column`/`row` containers migrate to `stack`, then v1 flat nodes get
 * their props bag, all on the fly — so schemas saved before the stack model or
 * the v2 wire format still render (identity-preserving when there is nothing
 * to migrate).
 */
const renderSchema = computed(
  () =>
    healMissingPropsBags(
      migrateLegacyPasswordInput(migrateV1PropsBag(migrateLegacyTypes(props.schema))),
    ) as PageNode,
);

// ─── Element registry ─────────────────────────────────────────────────────────

const elements = useMergedElements(computed(() => props.config));

function defFor(node: PageNode): PageElementDefinition | undefined {
  return node.type === 'page' ? undefined : elements.value[node.type];
}

/** A named input = any element whose definition declares a value spec, carrying a `name`. */
type NamedNode = ElementNode & { name: string };

function isNamedInput(node: PageNode): node is NamedNode {
  const def = defFor(node);
  const name = (node as ElementNode).name;
  // Unsafe names (__proto__ & co) would collide with Object.prototype
  // machinery when used as map keys — excluded from the value model entirely
  // (they neither veto nor ship; the builder lint flags them).
  return !!def?.value && typeof name === 'string' && !!name && !isUnsafeFieldName(name);
}

/**
 * The allow-list gate applies to the VALUE model too, not just rendering:
 * disallowed subtrees must neither contribute defaults nor block validation —
 * otherwise an invisible required field could permanently veto every
 * validating button.
 */
function isNodeAllowed(node: PageNode): boolean {
  return isElementAllowed(node.type, props.config);
}

/**
 * `visibleWhen` gate, evaluated against the LIVE value model — and applied in
 * the SAME walks as the allow-list, so a hidden required field neither vetoes
 * a validating button nor ships its value in the payload (the conditional-
 * container trap). Values are kept internally while hidden (collectDefaults /
 * initialValues seeding ignore visibility), so re-showing restores them.
 * Malformed conditions fail OPEN (visible).
 */
function isNodeVisible(node: PageNode): boolean {
  // The page root is always visible — a (hand-written) root condition could
  // otherwise blank the whole page with nothing left to toggle it back.
  if (node.type === 'page') return true;
  const vw = (node as ElementNode).visibleWhen;
  if (!vw || typeof vw !== 'object') return true;
  if (typeof vw.field !== 'string' || vw.field === '') return true;
  const value = values.value[vw.field];
  if ('equals' in vw) return sameValue(value, vw.equals);
  if (Array.isArray(vw.in)) return vw.in.some((x) => sameValue(value, x));
  return true;
}

/** Outward value map: the named inputs of the allowed AND currently visible tree. */
function visibleValues(): ActionValues {
  const out: ActionValues = {};
  const walk = (node: PageNode) => {
    if (!isNodeAllowed(node) || !isNodeVisible(node)) return;
    if (isNamedInput(node) && node.name in values.value) out[node.name] = values.value[node.name];
    if ('children' in node && Array.isArray(node.children)) node.children.forEach(walk);
  };
  walk(renderSchema.value);
  return out;
}

/** Names of the named inputs in the allowed AND currently visible tree. */
function visibleFieldNames(): Set<string> {
  const names = new Set<string>();
  const walk = (node: PageNode) => {
    if (!isNodeAllowed(node) || !isNodeVisible(node)) return;
    if (isNamedInput(node)) names.add(node.name);
    if ('children' in node && Array.isArray(node.children)) node.children.forEach(walk);
  };
  walk(renderSchema.value);
  return names;
}

// ─── Init ─────────────────────────────────────────────────────────────────────

function collectDefaults(node: PageNode): ActionValues {
  const defaults: ActionValues = {};
  if (!isNodeAllowed(node)) return defaults;
  if (isNamedInput(node)) {
    // Node-level default wins; the definition's factory is the fallback.
    const fallback = defFor(node)?.value?.defaultValue?.(node.props);
    const seed = node.defaultValue !== undefined ? node.defaultValue : fallback;
    if (seed !== undefined) defaults[node.name] = seed;
  }
  if ('children' in node && Array.isArray(node.children)) {
    for (const child of node.children) Object.assign(defaults, collectDefaults(child));
  }
  return defaults;
}

/** Names of the named inputs in the allowed tree — the only keys `initialValues` may seed. */
function collectFieldNames(node: PageNode, out: Set<string>) {
  if (!isNodeAllowed(node)) return;
  if (isNamedInput(node) && node.name) out.add(node.name);
  if ('children' in node && Array.isArray(node.children)) {
    for (const child of node.children) collectFieldNames(child, out);
  }
}

/** Baseline for `isDirty` — the value map as of the last (re-)initialization. */
let valuesBaseline: ActionValues = {};

function initValues() {
  const defaults = collectDefaults(renderSchema.value);
  if (props.initialValues) {
    const names = new Set<string>();
    collectFieldNames(renderSchema.value, names);
    for (const [k, v] of Object.entries(props.initialValues)) {
      if (names.has(k)) defaults[k] = v;
    }
  }
  values.value = defaults;
  valuesBaseline = { ...defaults };
  touched.value = {};
  asyncErrors.value = {};
  formError.value = '';
  emit('update:values', visibleValues());
}

/**
 * Per-key value equality: Object.is over the RAW values (the value model
 * hands out reactive proxies while baselines/initialValues hold raw objects —
 * the same underlying object must compare equal), plus array-by-content so
 * `['a'] vs ['a']` (multi-select values, re-minted inline literals) compare
 * as equal. Distinct objects with equal content stay unequal (one level, by
 * design).
 */
function sameValue(a: unknown, b: unknown): boolean {
  const ra = toRaw(a);
  const rb = toRaw(b);
  if (Object.is(ra, rb)) return true;
  if (Array.isArray(ra) && Array.isArray(rb)) {
    return ra.length === rb.length && ra.every((x, i) => sameValue(x, rb[i]));
  }
  return false;
}

/** Shallow value equality — key set + `sameValue` per key. */
function shallowEqual(a?: ActionValues, b?: ActionValues): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  return keys.every((k) => sameValue(a[k], b[k]));
}

initValues();
watch(() => props.schema, initValues, { deep: false });
// Guarded by VALUE, not reference: an inline `:initial-values="{ … }"` literal
// mints a new object on every parent render — a value-identical replacement
// must not wipe the user's in-progress input. Compared over the keys the form
// actually CONSUMES (named inputs of the allowed tree), so changes to
// irrelevant keys can't wipe input either.
watch(() => props.initialValues, (next, prev) => {
  const names = new Set<string>();
  collectFieldNames(renderSchema.value, names);
  const consumed = (source?: ActionValues): ActionValues => {
    const out: ActionValues = {};
    for (const k of Object.keys(source ?? {})) {
      if (names.has(k)) out[k] = source![k];
    }
    return out;
  };
  if (shallowEqual(consumed(next), consumed(prev))) return;
  initValues();
});

// ─── Reactive error computation ───────────────────────────────────────────────

// One compile (and at most one warning) per distinct pattern — computeFieldError
// runs during render, so a throwing `new RegExp` here crashed the whole page.
const patternCache = new Map<string, RegExp | null>();
function patternFor(pattern: string): RegExp | null {
  let re = patternCache.get(pattern);
  if (re === undefined) {
    re = compilePagePattern(pattern);
    if (re === null) {
      console.warn(
        `[CoarPageRenderer] validation.pattern ${JSON.stringify(pattern)} is not a valid regular expression — rule ignored.`,
      );
    }
    patternCache.set(pattern, re);
  }
  return re;
}

/** Default emptiness for `required`: unset, '', false, and [] all count as empty. */
function defaultIsEmpty(value: unknown): boolean {
  return (
    value === undefined || value === null || value === '' || value === false ||
    (Array.isArray(value) && value.length === 0)
  );
}

// Consumer `validate` hooks run inside the reactive error walk — a throwing
// hook must not take the whole page down. Warn once per element type.
const warnedValidateThrew = new Set<string>();

function computeFieldError(node: NamedNode, def: PageElementDefinition): string {
  const value = values.value[node.name];
  const v = node.validation;

  if (v?.required) {
    // The definition owns its emptiness semantics (e.g. OTP completeness);
    // the default covers the common scalar/array cases.
    const empty = def.value?.isEmpty
      ? def.value.isEmpty(value, node.props)
      : defaultIsEmpty(value);
    if (empty) return v.message ?? t('coar.pageBuilder.validation.required', undefined, 'This field is required');
  }

  // The string rules stay host-enforced (they need the localized message
  // pipeline and the cached, crash-safe pattern compiler); elements opt in
  // via `value.textRules` — others express their rules via `validate`.
  if (v && def.value?.textRules && typeof value === 'string') {
    if (v.minLength && value.length < v.minLength)
      return v.message ?? t('coar.pageBuilder.validation.minLength', { n: v.minLength }, 'Minimum {n} characters');
    if (v.maxLength && value.length > v.maxLength)
      return v.message ?? t('coar.pageBuilder.validation.maxLength', { n: v.maxLength }, 'Maximum {n} characters');
    if (v.pattern) {
      const re = patternFor(v.pattern);
      if (re && !re.test(value)) return v.message ?? t('coar.pageBuilder.validation.pattern', undefined, 'Invalid format');
    }
  }

  // `inputType: 'email'` opts into the built-in full-string format check by
  // default — the most common format rule must not need a hand-written
  // pattern. Rides the textRules opt-in like the other host string rules, so
  // consumer elements with an inputType prop participate by declaration.
  if (
    def.value?.textRules && typeof value === 'string' && value !== '' &&
    (node.props as { inputType?: unknown }).inputType === 'email' && !isValidEmail(value)
  ) {
    return v?.message ?? t('coar.pageBuilder.validation.email', undefined, 'Enter a valid email address');
  }

  if (v?.matchField) {
    if (value !== values.value[v.matchField])
      return v.message ?? t('coar.pageBuilder.validation.matchField', undefined, 'Does not match');
  }

  if (def.value?.validate) {
    try {
      const custom = def.value.validate(value, node, values.value);
      if (custom) return custom;
    } catch (e) {
      if (!warnedValidateThrew.has(node.type)) {
        warnedValidateThrew.add(node.type);
        console.warn(`[CoarPageRenderer] validate hook of element "${node.type}" threw — rule ignored.`, e);
      }
    }
  }

  return '';
}

function collectErrors(node: PageNode, out: Record<string, string>) {
  if (!isNodeAllowed(node) || !isNodeVisible(node)) return;
  if (isNamedInput(node)) {
    const def = defFor(node);
    const err = def ? computeFieldError(node, def) : '';
    if (err) out[node.name] = err;
  }
  if ('children' in node && Array.isArray(node.children)) {
    node.children.forEach(c => collectErrors(c, out));
  }
}

// Declarative rule errors, computed reactively. Reading values.value inside
// makes it re-run when any value changes — including the matchField source.
// `onValidate` deliberately does NOT run here: it may be async (server
// validation) and only fires at submit time, in triggerAction.
const computedErrors = computed<Record<string, string>>(() => {
  const errors: Record<string, string> = {};
  collectErrors(renderSchema.value, errors);
  return errors;
});

const isFormValid = computed(() => Object.keys(computedErrors.value).length === 0);

/** True once any field differs from its initial value (schema defaults + initialValues). */
const isDirty = computed(() => !shallowEqual(values.value, valuesBaseline));

// ─── Touched helpers ──────────────────────────────────────────────────────────

function markAllTouched(node: PageNode) {
  if (!isNodeAllowed(node) || !isNodeVisible(node)) return;
  if (isNamedInput(node) && node.name) touched.value[node.name] = true;
  if ('children' in node && Array.isArray(node.children)) node.children.forEach(markAllTouched);
}

// ─── Context ──────────────────────────────────────────────────────────────────

// Track which disallowed/unknown types we've already warned about, so the
// console isn't spammed when a schema contains many instances of the same one.
const warnedDisallowed = new Set<string>();
const warnedUnknown = new Set<string>();

/** True while a trigger is in flight — every further click is ignored (reentry guard). */
function isBusy(): boolean {
  return isValidating.value || isSubmitting.value;
}

const rootEl = ref<HTMLElement | null>(null);

/**
 * After a failed validating click, move focus to the first invalid control —
 * on a long page the revealed errors may sit off-screen and the click would
 * otherwise look dead. CoarFormField marks its control `aria-invalid`.
 */
async function focusFirstError() {
  await nextTick();
  const el = rootEl.value?.querySelector<HTMLElement>('[aria-invalid="true"]');
  if (!el) return;
  el.focus?.();
  el.scrollIntoView?.({ block: 'center' });
}

const genericActionError = () =>
  t('coar.pageBuilder.formError.actionFailed', undefined, 'Something went wrong. Please try again.');

/**
 * Runs the action handler, awaiting a returned Promise: `isSubmitting` covers
 * the whole flight window, and a rejection surfaces in the form banner —
 * `Error.message` is the consumer's user-facing channel ("Invalid
 * credentials"), anything else falls back to a localized generic message.
 * `payload` is a snapshot, never the live reactive object — the validated
 * path passes the exact snapshot `onValidate` approved.
 */
async function runAction(id: string, payload?: ActionValues) {
  const handler = props.actions?.[id];
  if (!handler) return;
  isSubmitting.value = true;
  try {
    await handler(payload ?? visibleValues());
  } catch (e) {
    formError.value = (e instanceof Error && e.message) || genericActionError();
    console.error(`[CoarPageRenderer] action "${id}" failed.`, e);
  } finally {
    isSubmitting.value = false;
  }
}

/**
 * Submit path of a `validates: true` button: reveal every declarative error
 * (the button stays clickable — a disabled button can't explain itself), then
 * run the submit-time `onValidate` (possibly async), and only call the action
 * when everything is clean. ONE snapshot serves validation AND the action —
 * inputs stay editable during an async `onValidate`, and edits made in that
 * window must not ship unvalidated (they need their own submit).
 */
async function runValidatedAction(id: string) {
  markAllTouched(renderSchema.value);
  if (!isFormValid.value) {
    void focusFirstError();
    return;
  }
  const payload = visibleValues();
  if (props.onValidate) {
    isValidating.value = true;
    try {
      const result = await props.onValidate(payload);
      const errors: Record<string, string> = {};
      for (const [k, v] of Object.entries(result ?? {})) {
        if (v && !isUnsafeFieldName(k)) errors[k] = v;
      }
      // `_form` addresses the form, not a field — route it to the banner.
      formError.value = errors[FORM_ERROR_KEY] ?? '';
      delete errors[FORM_ERROR_KEY];
      // Errors keyed to fields that cannot display (hidden by visibleWhen,
      // renamed, never on the page) would block the submit with zero visible
      // feedback — route their messages to the banner instead.
      const displayable = visibleFieldNames();
      const orphaned = Object.keys(errors).filter((k) => !displayable.has(k));
      if (orphaned.length > 0) {
        formError.value = [formError.value, ...orphaned.map((k) => errors[k])]
          .filter(Boolean)
          .join(' ');
        for (const k of orphaned) delete errors[k];
      }
      asyncErrors.value = errors;
      if (Object.keys(errors).length > 0 || formError.value) {
        if (Object.keys(errors).length > 0) void focusFirstError();
        return;
      }
    } catch (e) {
      formError.value = genericActionError();
      console.error('[CoarPageRenderer] onValidate threw — action not executed.', e);
      return;
    } finally {
      isValidating.value = false;
    }
  }
  await runAction(id, payload);
}

/** One trigger at a time: guard reentry, track the pending id, clear the stale banner. */
async function runTrigger(id: string, validates: boolean) {
  if (isBusy()) return;
  formError.value = '';
  pendingAction.value = id;
  try {
    if (validates) await runValidatedAction(id);
    else await runAction(id);
  } finally {
    pendingAction.value = null;
  }
}

// ─── Enter to submit ──────────────────────────────────────────────────────────

/**
 * The page's default button (opt-in via the root's `enterSubmits`): the first
 * `default: true` button, else the first `validates: true` button, in tree
 * order — disallowed subtrees excluded, like everywhere else.
 */
const enterTarget = computed<{ action: string; validates: boolean } | null>(() => {
  const root = renderSchema.value as PageRootNode;
  if (root.type !== 'page' || !root.enterSubmits) return null;
  let dflt: { action: string; validates: boolean } | null = null;
  let firstValidating: { action: string; validates: boolean } | null = null;
  const walk = (node: PageNode) => {
    if (dflt || !isNodeAllowed(node) || !isNodeVisible(node)) return;
    if (node.type === 'button') {
      const p = (node as ButtonNode).props ?? {};
      if (typeof p.action === 'string' && p.action) {
        if (p.default) { dflt = { action: p.action, validates: !!p.validates }; return; }
        if (p.validates && !firstValidating) firstValidating = { action: p.action, validates: true };
      }
    }
    if ('children' in node && Array.isArray(node.children)) node.children.forEach(walk);
  };
  walk(root);
  return dflt ?? firstValidating;
});

/**
 * Enter fires the default button when BOTH sides opted in: the page root
 * (`enterSubmits`) and the element under the caret (`value.submitOnEnter`,
 * resolved by PageNode into a data attribute on the element's root). Plain
 * Enter only; an Enter the element already consumed (`defaultPrevented`, e.g.
 * a picker popover) never submits.
 */
function onEnterKey(e: KeyboardEvent) {
  const target = enterTarget.value;
  if (!target) return;
  if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
  // An IME composition-commit Enter (Japanese/Chinese/Korean input) confirms
  // the composition, it does not submit — Vue's .enter modifier does not
  // filter it.
  if (e.isComposing) return;
  const el = e.target as Element | null;
  if (!el?.closest?.('[data-pb-enter-submit]')) return;
  // Commit-on-blur controls (number input) flush their pending edit on blur —
  // the submit must read the value the user SEES, not the last committed one.
  // On a failed submit, focusFirstError restores focus.
  if (el instanceof HTMLElement) el.blur();
  void runTrigger(target.action, target.validates);
}

const ctx: PageRendererContext = {
  get actions() { return props.actions; },
  // The builder passes one shared config to both components; the explicit
  // prop stays as the override, config as the documented fallback.
  get assetResolver() { return props.assetResolver ?? props.config?.assetResolver; },
  get config() { return props.config; },
  elements,
  reportDisallowed(type: string) {
    if (warnedDisallowed.has(type)) return;
    warnedDisallowed.add(type);
    console.warn(
      `[CoarPageRenderer] Element type "${type}" is not in `
      + `config.allowedElements; instances were skipped at render time.`,
    );
  },
  reportUnknown(type: string) {
    if (warnedUnknown.has(type)) return;
    warnedUnknown.add(type);
    console.warn(
      `[CoarPageRenderer] No element registration for type "${type}" — `
      + `instances were skipped at render time (register it via config.elements).`,
    );
  },
  isVisible: isNodeVisible,
  isFormValid,
  isValidating,
  isSubmitting,
  pendingAction,
  formError,
  // Unsafe keys also poison READS: `obj['__proto__']` returns the prototype
  // object, which would leak into inputs/error slots as a truthy value.
  getValue: (name) => (isUnsafeFieldName(name) ? undefined : values.value[name]),
  setValue: (name, value) => {
    // Unsafe keys (__proto__ & co) would rebind the map's prototype instead
    // of storing a value — such fields are outside the value model entirely.
    if (isUnsafeFieldName(name)) return;
    values.value[name] = value;
    // A stale server-side error must not outlive the edit that addresses it.
    if (asyncErrors.value[name]) {
      const next = { ...asyncErrors.value };
      delete next[name];
      asyncErrors.value = next;
    }
    if (formError.value) formError.value = '';
    emit('update:values', visibleValues());
  },
  getError: (name) =>
    !isUnsafeFieldName(name) && touched.value[name]
      ? (computedErrors.value[name] ?? asyncErrors.value[name] ?? '')
      : '',
  markTouched: (name) => {
    if (isUnsafeFieldName(name)) return;
    touched.value[name] = true;
  },
  triggerAction(id, validates = false) {
    void runTrigger(id, validates);
  },
};

provide(PAGE_RENDERER_KEY, ctx);

// ─── Host form API ────────────────────────────────────────────────────────────

defineExpose({
  /** Snapshot of the current value map (allowed + visible fields; copy — safe to keep). */
  values: computed(() => visibleValues()),
  /** True once any field differs from its initial state. */
  isDirty,
  /** Quiet validation state — true when every declarative rule passes. */
  isFormValid,
  /** Back to the initial state: schema defaults + initialValues; touched/errors/banner cleared. */
  reset: () => initValues(),
});
</script>

<template>
  <div ref="rootEl" class="coar-page-renderer" @keydown.enter="onEnterKey">
    <!-- Form-level error channel (`_form` / action rejection). The default
         banner sits above the page; the slot replaces the presentation, and a
         consumer element can render it in-page via usePageElement().formError. -->
    <slot name="form-error" :error="formError">
      <div v-if="formError" class="pb-form-error" role="alert">
        <CoarNote variant="error" padding="s">{{ formError }}</CoarNote>
      </div>
    </slot>
    <PageNode_ :node="renderSchema" />
  </div>
</template>

<style scoped>
.coar-page-renderer {
  display: contents;
}

.pb-form-error {
  margin-bottom: var(--coar-spacing-m);
}
</style>
