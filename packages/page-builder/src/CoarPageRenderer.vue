<script setup lang="ts">
import { computed, provide, ref, watch } from 'vue';
import type {
  PageNode,
  TextInputNode,
  CheckboxNode,
  SelectNode,
  PageConfig,
  FieldValidation,
} from './schema';
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
}>();

// ─── State ────────────────────────────────────────────────────────────────────

const values = ref<ActionValues>({});
const touched = ref<Record<string, boolean>>({});

type NamedInputNode = TextInputNode | CheckboxNode | SelectNode;

function isNamedInput(node: PageNode): node is NamedInputNode {
  return (
    (node.type === 'text-input' || node.type === 'checkbox' || node.type === 'select') &&
    !!(node as NamedInputNode).name
  );
}

// ─── Init ─────────────────────────────────────────────────────────────────────

function collectDefaults(node: PageNode): ActionValues {
  const defaults: ActionValues = {};
  if (isNamedInput(node) && node.name && node.defaultValue !== undefined) {
    defaults[node.name] = node.defaultValue;
  }
  if ('children' in node && Array.isArray(node.children)) {
    for (const child of node.children) Object.assign(defaults, collectDefaults(child));
  }
  return defaults;
}

function initValues() {
  values.value = collectDefaults(props.schema);
  touched.value = {};
}

initValues();
watch(() => props.schema, initValues, { deep: false });

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
    const empty = value === undefined || value === null || value === '' || value === false;
    if (empty) return v.message ?? 'This field is required';
  }

  if (node.type === 'text-input' && typeof value === 'string') {
    if (v.minLength && value.length < v.minLength)
      return v.message ?? `Minimum ${v.minLength} characters`;
    if (v.maxLength && value.length > v.maxLength)
      return v.message ?? `Maximum ${v.maxLength} characters`;
    if (v.pattern) {
      const re = patternFor(v.pattern);
      if (re && !re.test(value)) return v.message ?? 'Invalid format';
    }
  }

  if (v.matchField) {
    if (value !== values.value[v.matchField])
      return v.message ?? 'Does not match';
  }

  return '';
}

function collectErrors(node: PageNode, out: Record<string, string>) {
  if (isNamedInput(node) && node.name) {
    const err = computeFieldError(node);
    if (err) out[node.name] = err;
  }
  if ('children' in node && Array.isArray(node.children)) {
    node.children.forEach(c => collectErrors(c, out));
  }
}

// All errors, computed reactively. Reading values.value inside makes it
// automatically re-run when any value changes — including the matchField source.
const computedErrors = computed<Record<string, string>>(() => {
  const errors: Record<string, string> = {};
  collectErrors(props.schema, errors);
  if (props.onValidate) {
    const custom = props.onValidate(values.value);
    for (const [k, v] of Object.entries(custom)) {
      if (v) errors[k] = v;
    }
  }
  return errors;
});

const isFormValid = computed(() => Object.keys(computedErrors.value).length === 0);

// ─── Touched helpers ──────────────────────────────────────────────────────────

function markAllTouched(node: PageNode) {
  if (isNamedInput(node) && node.name) touched.value[node.name] = true;
  if ('children' in node && Array.isArray(node.children)) node.children.forEach(markAllTouched);
}

// ─── Context ──────────────────────────────────────────────────────────────────

// Track which disallowed types we've already warned about, so the console isn't
// spammed when a schema contains many instances of the same forbidden element.
const warnedDisallowed = new Set<string>();

const ctx: PageRendererContext = {
  get actions() { return props.actions; },
  get assetResolver() { return props.assetResolver; },
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
  getValue: (name) => values.value[name],
  setValue: (name, value) => { values.value[name] = value; },
  getError: (name) => touched.value[name] ? (computedErrors.value[name] ?? '') : '',
  markTouched: (name) => { touched.value[name] = true; },
  triggerAction(id, validates = false) {
    if (validates) {
      markAllTouched(props.schema);
      if (!isFormValid.value) return;
    }
    props.actions?.[id]?.(values.value);
  },
};

provide(PAGE_RENDERER_KEY, ctx);
</script>

<template>
  <div class="coar-page-renderer">
    <PageNode_ :node="schema" />
  </div>
</template>

<style scoped>
.coar-page-renderer {
  display: contents;
}
</style>
