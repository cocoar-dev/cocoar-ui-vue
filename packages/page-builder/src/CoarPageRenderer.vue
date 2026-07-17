<script setup lang="ts">
import { computed, provide, ref, watch } from 'vue';
import { useI18n } from '@cocoar/vue-localization';
import { isElementAllowed } from './schema';
import type { ElementNode, PageNode, PageConfig } from './schema';
import { useMergedElements } from './elements/useMergedElements';
import type { PageElementDefinition } from './elements/registry';
import { migrateLegacyTypes } from './builder/schemaNormalize';
import { migrateV1PropsBag, migrateLegacyPasswordInput } from './builder/schemaMigrateV1';
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
  () => migrateLegacyPasswordInput(migrateV1PropsBag(migrateLegacyTypes(props.schema))) as PageNode,
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
  return !!def?.value && typeof (node as ElementNode).name === 'string' && !!(node as ElementNode).name;
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
  if (!isNodeAllowed(node)) return;
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

// ─── Touched helpers ──────────────────────────────────────────────────────────

function markAllTouched(node: PageNode) {
  if (!isNodeAllowed(node)) return;
  if (isNamedInput(node) && node.name) touched.value[node.name] = true;
  if ('children' in node && Array.isArray(node.children)) node.children.forEach(markAllTouched);
}

// ─── Context ──────────────────────────────────────────────────────────────────

// Track which disallowed/unknown types we've already warned about, so the
// console isn't spammed when a schema contains many instances of the same one.
const warnedDisallowed = new Set<string>();
const warnedUnknown = new Set<string>();

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
