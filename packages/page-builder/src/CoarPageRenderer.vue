<script setup lang="ts">
import { computed, provide, ref, watch } from 'vue';
import { useI18n } from '@cocoar/vue-localization';
import { isElementAllowed } from './schema';
import type {
  PageNode,
  TextInputNode,
  NumberInputNode,
  CheckboxNode,
  SwitchNode,
  RadioGroupNode,
  SelectNode,
  MultiSelectNode,
  OtpInputNode,
  DateInputNode,
  DateTimeInputNode,
  PageConfig,
  FieldValidation,
} from './schema';
import { migrateLegacyTypes } from './builder/schemaNormalize';
import { migrateV1PropsBag } from './builder/schemaMigrateV1';
import {
  PAGE_RENDERER_KEY,
  type ActionHandler,
  type ActionValues,
  type CustomValidator,
  type PageRendererContext,
} from './context';
import { compilePagePattern } from './renderSafety';
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

const { t } = useI18n();

// ─── State ────────────────────────────────────────────────────────────────────

const values = ref<ActionValues>({});
const touched = ref<Record<string, boolean>>({});
/** Field errors from the submit-time `onValidate` — cleared per field on edit. */
const asyncErrors = ref<Record<string, string>>({});
const isValidating = ref(false);

/**
 * Legacy `column`/`row` containers migrate to `stack`, then v1 flat nodes get
 * their props bag, all on the fly — so schemas saved before the stack model or
 * the v2 wire format still render (identity-preserving when there is nothing
 * to migrate).
 */
const renderSchema = computed(
  () => migrateV1PropsBag(migrateLegacyTypes(props.schema)) as PageNode,
);

type NamedInputNode =
  | TextInputNode
  | NumberInputNode
  | CheckboxNode
  | SwitchNode
  | RadioGroupNode
  | SelectNode
  | MultiSelectNode
  | OtpInputNode
  | DateInputNode
  | DateTimeInputNode;

const NAMED_INPUT_TYPES: ReadonlySet<string> = new Set([
  'text-input', 'number-input', 'checkbox', 'switch', 'radio-group',
  'select', 'multi-select', 'otp-input', 'date-input', 'datetime-input',
]);

function isNamedInput(node: PageNode): node is NamedInputNode {
  return NAMED_INPUT_TYPES.has(node.type) && !!(node as NamedInputNode).name;
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

// ─── Init ─────────────────────────────────────────────────────────────────────

function collectDefaults(node: PageNode): ActionValues {
  const defaults: ActionValues = {};
  if (!isNodeAllowed(node)) return defaults;
  if (isNamedInput(node) && node.name && node.defaultValue !== undefined) {
    defaults[node.name] = node.defaultValue;
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
  touched.value = {};
  asyncErrors.value = {};
}

initValues();
watch(() => props.schema, initValues, { deep: false });
watch(() => props.initialValues, initValues, { deep: false });

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

function computeFieldError(node: NamedInputNode): string {
  const value = values.value[node.name!];
  // Checkbox/select validation is typed as Pick<…, 'required'>, but hand-written
  // JSON can carry the full rule set — widening keeps the runtime checks (and
  // their behavior) uniform across the named-input types.
  const v = node.validation as FieldValidation | undefined;
  if (!v) return '';

  if (v.required) {
    const empty =
      value === undefined || value === null || value === '' || value === false ||
      // multi-select: required means at least one selection
      (Array.isArray(value) && value.length === 0) ||
      // otp: required means the code is COMPLETE, not merely started
      (node.type === 'otp-input' &&
        typeof value === 'string' && value.length < (node.props.length ?? 6));
    if (empty) return v.message ?? t('coar.pageBuilder.validation.required', undefined, 'This field is required');
  }

  if (node.type === 'text-input' && typeof value === 'string') {
    if (v.minLength && value.length < v.minLength)
      return v.message ?? t('coar.pageBuilder.validation.minLength', { n: v.minLength }, 'Minimum {n} characters');
    if (v.maxLength && value.length > v.maxLength)
      return v.message ?? t('coar.pageBuilder.validation.maxLength', { n: v.maxLength }, 'Maximum {n} characters');
    if (v.pattern) {
      const re = patternFor(v.pattern);
      if (re && !re.test(value)) return v.message ?? t('coar.pageBuilder.validation.pattern', undefined, 'Invalid format');
    }
  }

  if (v.matchField) {
    if (value !== values.value[v.matchField])
      return v.message ?? t('coar.pageBuilder.validation.matchField', undefined, 'Does not match');
  }

  return '';
}

function collectErrors(node: PageNode, out: Record<string, string>) {
  if (!isNodeAllowed(node)) return;
  if (isNamedInput(node) && node.name) {
    const err = computeFieldError(node);
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

// ─── Touched helpers ──────────────────────────────────────────────────────────

function markAllTouched(node: PageNode) {
  if (!isNodeAllowed(node)) return;
  if (isNamedInput(node) && node.name) touched.value[node.name] = true;
  if ('children' in node && Array.isArray(node.children)) node.children.forEach(markAllTouched);
}

// ─── Context ──────────────────────────────────────────────────────────────────

// Track which disallowed types we've already warned about, so the console isn't
// spammed when a schema contains many instances of the same forbidden element.
const warnedDisallowed = new Set<string>();

/**
 * Submit path of a `validates: true` button: reveal every declarative error
 * (the button stays clickable — a disabled button can't explain itself), then
 * run the submit-time `onValidate` (possibly async), and only call the action
 * when everything is clean.
 */
async function runValidatedAction(id: string) {
  if (isValidating.value) return;
  markAllTouched(renderSchema.value);
  if (!isFormValid.value) return;
  if (props.onValidate) {
    isValidating.value = true;
    try {
      const result = await props.onValidate(values.value);
      const errors: Record<string, string> = {};
      for (const [k, v] of Object.entries(result ?? {})) {
        if (v) errors[k] = v;
      }
      asyncErrors.value = errors;
      if (Object.keys(errors).length > 0) return;
    } catch (e) {
      console.error('[CoarPageRenderer] onValidate threw — action not executed.', e);
      return;
    } finally {
      isValidating.value = false;
    }
  }
  props.actions?.[id]?.(values.value);
}

const ctx: PageRendererContext = {
  get actions() { return props.actions; },
  // The builder passes one shared config to both components; the explicit
  // prop stays as the override, config as the documented fallback.
  get assetResolver() { return props.assetResolver ?? props.config?.assetResolver; },
  get config() { return props.config; },
  reportDisallowed(type: string) {
    if (warnedDisallowed.has(type)) return;
    warnedDisallowed.add(type);
    console.warn(
      `[CoarPageRenderer] Element type "${type}" is not in `
      + `config.allowedElements; instances were skipped at render time.`,
    );
  },
  isFormValid,
  isValidating,
  getValue: (name) => values.value[name],
  setValue: (name, value) => {
    values.value[name] = value;
    // A stale server-side error must not outlive the edit that addresses it.
    if (asyncErrors.value[name]) {
      const next = { ...asyncErrors.value };
      delete next[name];
      asyncErrors.value = next;
    }
  },
  getError: (name) =>
    touched.value[name] ? (computedErrors.value[name] ?? asyncErrors.value[name] ?? '') : '',
  markTouched: (name) => { touched.value[name] = true; },
  triggerAction(id, validates = false) {
    if (validates) {
      void runValidatedAction(id);
      return;
    }
    props.actions?.[id]?.(values.value);
  },
};

provide(PAGE_RENDERER_KEY, ctx);
</script>

<template>
  <div class="coar-page-renderer">
    <PageNode_ :node="renderSchema" />
  </div>
</template>

<style scoped>
.coar-page-renderer {
  display: contents;
}
</style>
