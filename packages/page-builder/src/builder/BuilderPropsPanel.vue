<script setup lang="ts">
import { computed, inject } from 'vue';
import { useI18n } from '@cocoar/vue-localization';
import {
  CoarIcon,
  CoarFormField,
  CoarTextInput,
  CoarCheckbox,
  CoarSelect,
  type CoarSelectOption,
} from '@cocoar/vue-ui';
import type { PageNode, NodeStyle, ElementNode, FieldValidation, PageRootNode, VisibleWhen } from '../schema';
import { BUILDER_API, BUILDER_CONFIG, BUILDER_VALIDATION } from './builderContext';
import type { NodePath } from './operations';
import { useMergedElements } from '../elements/useMergedElements';
import { compatibleFields, compatibleElementTypes } from '../elements/fieldContract';
import { isElementAllowed } from '../schema';
import StyleProps from './props/StyleProps.vue';

defineOptions({ name: 'BuilderPropsPanel' });

const { t } = useI18n();

const builder = inject(BUILDER_API)!;
const config = inject(BUILDER_CONFIG);
const validation = inject(BUILDER_VALIDATION);
const elements = useMergedElements(config);

const node = computed(() => builder.selectedNode.value);
const path = computed(() => builder.selectedPath.value ?? []);

/** Registry definition for the selected node (undefined for `page`). */
const def = computed(() => (node.value ? elements.value[node.value.type] : undefined));

/** The selected node, narrowed to the element grammar when it participates in the value model. */
const fieldNode = computed<ElementNode | null>(() =>
  node.value && def.value?.value ? (node.value as ElementNode) : null,
);

const inspector = computed(() => def.value?.builder?.inspector);
const defaultValueInput = computed(() => def.value?.builder?.defaultValueInput);

const inspectorTitle = computed(() => {
  const b = def.value?.builder;
  if (!b) return '';
  const text = b.inspectorTitle ?? b.label;
  return t(text.key, undefined, text.fallback);
});

const isContainer = computed(
  () => node.value?.type === 'page' || def.value?.container === true,
);

/** The page root, when selected — it gets a host-owned Page section (no registry definition). */
const pageNode = computed<PageRootNode | null>(() =>
  node.value?.type === 'page' ? (node.value as PageRootNode) : null,
);

const nodeIssues = computed(() =>
  node.value ? validation?.byNodeId.value.get(node.value.id) ?? [] : [],
);

function patch(update: Partial<PageNode>) {
  if (!path.value) return;
  builder.patch(path.value as NodePath, update);
}

function patchStyle(update: Partial<NodeStyle>) {
  if (!node.value) return;
  patch({ style: { ...(node.value.style ?? {}), ...update } } as Partial<PageNode>);
}

function setRequired(v: boolean) {
  // Merge into the existing rules — JSON-authored minLength/pattern/matchField/
  // message must survive toggling Required in the panel.
  const next: FieldValidation = { ...fieldNode.value?.validation };
  if (v) next.required = true;
  else delete next.required;
  patch({ validation: Object.keys(next).length > 0 ? next : undefined });
}

// ─── Field contract ───────────────────────────────────────────────────────────
// With `config.fields`, the name becomes a pick from the contract, filtered to
// fields this element can edit (ElementValueSpec.types).

const contractFields = computed(() => config?.value?.fields);
const useFieldSelect = computed(() => (contractFields.value?.length ?? 0) > 0);
const allowCustom = computed(() => config?.value?.allowCustomFields === true);

const fieldOptions = computed<CoarSelectOption<string>[]>(() => {
  if (!contractFields.value || !def.value) return [];
  const opts = compatibleFields(def.value, contractFields.value).map((f) => ({
    value: f.name,
    label: f.label ? `${f.label} (${f.name})` : f.name,
  }));
  // A bound name outside the contract stays visible (and lint flags it).
  const current = fieldNode.value?.name;
  if (current && !contractFields.value.some((f) => f.name === current)) {
    opts.unshift({ value: current, label: `${current} (custom)` });
  }
  return opts;
});

// ─── Representation switch ────────────────────────────────────────────────────
// Same field, different element: offered among the elements that can edit the
// bound contract field's value type (or, unbound, any type the current
// element declares). convertTo keeps id/name/defaultValue/validation/style +
// label; the rest of the bag restarts from the target's defaults.

const representationOptions = computed<CoarSelectOption<string>[]>(() => {
  const current = node.value;
  if (!current || !def.value?.value) return [];
  const boundField = contractFields.value?.find((f) => f.name === fieldNode.value?.name);
  let types: string[];
  if (boundField) {
    types = compatibleElementTypes(elements.value, boundField.valueType);
  } else {
    const own = def.value.value.types;
    if (!own || own.length === 0) return [];
    const set = new Set<string>();
    for (const t of own) for (const el of compatibleElementTypes(elements.value, t)) set.add(el);
    types = [...set];
  }
  let placeable = types.filter(
    (t) => elements.value[t]?.builder && isElementAllowed(t, config?.value),
  );
  // A node with children can only switch to another container — converting to
  // a leaf would drop them (convertTo refuses it too).
  const kids = (current as { children?: unknown[] }).children;
  if (Array.isArray(kids) && kids.length > 0) {
    placeable = placeable.filter((t) => elements.value[t].container === true);
  }
  if (placeable.length < 2) return [];
  return placeable.map((t) => {
    const b = elements.value[t].builder!;
    return { value: t, label: t2(b.label.key, b.label.fallback) };
  });
});

function t2(key: string, fallback: string): string {
  return t(key, undefined, fallback);
}

function convertRepresentation(toType: string | null) {
  if (!toType || !node.value || toType === node.value.type) return;
  builder.convertTo(path.value as NodePath, toType);
}

// ─── Conditional visibility (visibleWhen) ─────────────────────────────────────
// Host vocabulary on every non-page node. The panel authors the `equals` form;
// the `in` form stays JSON-authorable and is surfaced read-only.

const showVisibility = computed(() => !!node.value && node.value.type !== 'page');
const visibleWhen = computed(() => (node.value as ElementNode | null)?.visibleWhen);
const hasInCondition = computed(() => Array.isArray(visibleWhen.value?.in));

/** Find the named input carrying `name` (the condition's controlling node). */
function findController(name: string): ElementNode | null {
  let found: ElementNode | null = null;
  const walk = (n: PageNode) => {
    if (found) return;
    const d = n.type === 'page' ? undefined : elements.value[n.type];
    if (d?.value && (n as ElementNode).name === name) { found = n as ElementNode; return; }
    if ('children' in n && Array.isArray(n.children)) n.children.forEach(walk);
  };
  walk(builder.schema.value);
  return found;
}

/**
 * How the controller's VALUE is typed — the `equals` editor must author the
 * matching type, because the runtime comparison is Object.is: a string '18'
 * never matches the number 18 a number-input writes. Derived from the
 * definition's declared value types (consumer elements included).
 */
type ControllerKind = 'boolean' | 'number' | 'string';
function kindOf(c: ElementNode | null): ControllerKind {
  if (!c) return 'string';
  const types = elements.value[c.type]?.value?.types;
  if (types?.includes('boolean')) return 'boolean';
  if (types?.includes('number')) return 'number';
  return 'string';
}

/**
 * Named inputs on the page (minus this node) — candidates for the controlling
 * field. Array-valued controllers (`string[]`) are excluded: an `equals`
 * condition on them is unsatisfiable by construction (v1 has no "contains").
 */
const controllerOptions = computed<CoarSelectOption<string>[]>(() => {
  const out: CoarSelectOption<string>[] = [];
  const walk = (n: PageNode) => {
    const d = n.type === 'page' ? undefined : elements.value[n.type];
    const name = (n as ElementNode).name;
    if (d?.value && typeof name === 'string' && name && n.id !== node.value?.id
      && !d.value.types?.includes('string[]')
      && !out.some((o) => o.value === name)) {
      out.push({ value: name, label: name });
    }
    if ('children' in n && Array.isArray(n.children)) n.children.forEach(walk);
  };
  walk(builder.schema.value);
  // A JSON-authored reference to a field not on the page stays visible (lint flags it).
  const current = visibleWhen.value?.field;
  if (current && !out.some((o) => o.value === current)) {
    out.push({ value: current, label: `${current} (?)` });
  }
  return out;
});

const controller = computed(() =>
  visibleWhen.value?.field ? findController(visibleWhen.value.field) : null,
);

/** Typed value choices where the controller's element suggests them; null → free text. */
const conditionValueOptions = computed<CoarSelectOption<string>[] | null>(() => {
  const c = controller.value;
  if (!c) return null;
  if (kindOf(c) === 'boolean') {
    return [
      { value: 'true', label: t('coar.pageBuilder.props.checked', undefined, 'checked') },
      { value: 'false', label: t('coar.pageBuilder.props.unchecked', undefined, 'unchecked') },
    ];
  }
  const opts = (c.props as { options?: { value: string; label: string }[] }).options;
  if (Array.isArray(opts) && opts.length > 0) {
    return opts.map((o) => ({ value: o.value, label: o.label || o.value }));
  }
  return null;
});

const equalsDisplay = computed(() => {
  const e = visibleWhen.value?.equals;
  if (typeof e === 'boolean') return e ? 'true' : 'false';
  return e == null ? '' : String(e);
});

/** Author `equals` in the controller's value type. */
function typedEquals(raw: string | null, c: ElementNode | null): unknown {
  const kind = kindOf(c);
  if (kind === 'boolean') return raw === 'true';
  if (kind === 'number') {
    const n = Number(raw);
    return raw !== null && raw !== '' && !Number.isNaN(n) ? n : (raw ?? '');
  }
  return raw ?? '';
}

function setVisibilityField(name: string | null) {
  if (!name) {
    patch({ visibleWhen: undefined } as Partial<PageNode>);
    return;
  }
  const c = findController(name);
  const equals: unknown =
    kindOf(c) === 'boolean'
      ? true
      : ((c?.props as { options?: { value: string }[] } | undefined)?.options?.[0]?.value ?? '');
  patch({ visibleWhen: { field: name, equals } satisfies VisibleWhen } as Partial<PageNode>);
}

function setVisibilityEquals(raw: string | null) {
  const vw = visibleWhen.value;
  if (!vw) return;
  patch({
    visibleWhen: { field: vw.field, equals: typedEquals(raw, controller.value) } satisfies VisibleWhen,
  } as Partial<PageNode>);
}

function bindField(name: string | null) {
  if (!name) {
    patch({ name: undefined });
    return;
  }
  const update: Record<string, unknown> = { name };
  const field = contractFields.value?.find((f) => f.name === name);
  if (field) {
    // Take the contract label along — but never overwrite an author's label.
    const defaults = def.value?.builder?.defaults() as Record<string, unknown> | undefined;
    const currentLabel = (fieldNode.value?.props as Record<string, unknown> | undefined)?.label;
    if (
      field.label && defaults && 'label' in defaults &&
      (currentLabel === undefined || currentLabel === defaults.label)
    ) {
      update.props = { label: field.label };
    }
    if (field.required && !fieldNode.value?.validation?.required) {
      update.validation = { ...fieldNode.value?.validation, required: true };
    }
  }
  patch(update as Partial<PageNode>);
}
</script>

<template>
  <aside class="pb-props">
    <header class="pb-props__header">
      <CoarIcon name="settings" size="s" />
      <span class="pb-props__title">{{ t('coar.pageBuilder.props.panelTitle', undefined, 'Properties') }}</span>
    </header>

    <div v-if="!node" class="pb-props__empty">
      <CoarIcon name="settings" size="l" />
      <p class="pb-props__empty-title">{{ t('coar.pageBuilder.props.emptyTitle', undefined, 'No node selected') }}</p>
      <p class="pb-props__empty-hint">{{ t('coar.pageBuilder.props.emptyHint', undefined, 'Click a node in the outline or canvas to edit it.') }}</p>
    </div>

    <div v-else class="pb-props__body">
      <!-- ── Validation issues (warnings + errors for this node) ─────────── -->
      <ul v-if="nodeIssues.length > 0" class="pb-props__issues">
        <li
          v-for="(issue, i) in nodeIssues"
          :key="i"
          class="pb-props__issue"
          :class="`pb-props__issue--${issue.severity}`"
        >
          <CoarIcon
            :name="issue.severity === 'error' ? 'circle-alert' : 'triangle-alert'"
            size="s"
          />
          <span>{{ issue.message }}</span>
        </li>
      </ul>

      <!-- ── Host-owned page section (root-level behavior) ───────────────── -->
      <section v-if="pageNode" class="pb-props__section">
        <h4 class="pb-props__section-title">{{ t('coar.pageBuilder.props.section.page', undefined, 'Page') }}</h4>
        <CoarCheckbox
          :model-value="!!pageNode.enterSubmits"
          :label="t('coar.pageBuilder.props.enterSubmits', undefined, 'Enter submits (fires the default button)')"
          @update:model-value="(v) => patch({ enterSubmits: v || undefined } as Partial<PageNode>)"
        />
      </section>

      <!-- ── Host-owned field section (value-model participation) ────────── -->
      <section v-if="fieldNode" class="pb-props__section">
        <h4 class="pb-props__section-title">{{ t('coar.pageBuilder.props.section.field', undefined, 'Field') }}</h4>
        <CoarFormField :label="t('coar.pageBuilder.props.fieldName', undefined, 'Field name')">
          <CoarSelect
            v-if="useFieldSelect"
            :model-value="fieldNode.name ?? null"
            :options="fieldOptions"
            clearable
            :placeholder="t('coar.pageBuilder.props.fieldUnbound', undefined, 'Not bound')"
            @update:model-value="(v) => bindField(v)"
          />
          <CoarTextInput
            v-else
            :model-value="fieldNode.name ?? ''"
            @update:model-value="(v) => patch({ name: v })"
          />
        </CoarFormField>
        <CoarFormField
          v-if="useFieldSelect && allowCustom"
          :label="t('coar.pageBuilder.props.customFieldName', undefined, 'Custom name')"
        >
          <CoarTextInput
            :model-value="fieldNode.name ?? ''"
            @update:model-value="(v) => patch({ name: v })"
          />
        </CoarFormField>
        <CoarFormField
          v-if="representationOptions.length > 0"
          :label="t('coar.pageBuilder.props.elementType', undefined, 'Element')"
        >
          <CoarSelect
            :model-value="node.type"
            :options="representationOptions"
            @update:model-value="(v) => convertRepresentation(v)"
          />
        </CoarFormField>
        <CoarCheckbox
          :model-value="!!fieldNode.validation?.required"
          :label="t('coar.pageBuilder.props.required', undefined, 'Required')"
          @update:model-value="setRequired"
        />
        <CoarFormField :label="t('coar.pageBuilder.props.defaultValue', undefined, 'Default value')">
          <component
            :is="defaultValueInput"
            v-if="defaultValueInput"
            :model-value="fieldNode.defaultValue"
            :props="fieldNode.props"
            @update:model-value="(v: unknown) => patch({ defaultValue: v ?? undefined })"
          />
          <CoarTextInput
            v-else
            :model-value="String(fieldNode.defaultValue ?? '')"
            @update:model-value="(v) => patch({ defaultValue: v || undefined })"
          />
        </CoarFormField>
      </section>

      <!-- ── Element-specific section (delegated to the registry inspector) ─ -->
      <section
        v-if="inspector"
        class="pb-props__section"
        :class="{ 'pb-props__section--separated': !!fieldNode }"
      >
        <h4 class="pb-props__section-title">{{ inspectorTitle }}</h4>
        <component :is="inspector" :node="node" :patch="patch" />
      </section>

      <!-- ── Conditional visibility (host vocabulary, every non-page node) ── -->
      <section
        v-if="showVisibility"
        class="pb-props__section"
        :class="{ 'pb-props__section--separated': !!inspector || !!fieldNode }"
      >
        <h4 class="pb-props__section-title">{{ t('coar.pageBuilder.props.section.visibility', undefined, 'Visibility') }}</h4>
        <CoarFormField :label="t('coar.pageBuilder.props.visibleWhenField', undefined, 'Visible when')">
          <CoarSelect
            :model-value="visibleWhen?.field ?? null"
            :options="controllerOptions"
            clearable
            :placeholder="t('coar.pageBuilder.props.alwaysVisible', undefined, 'Always visible')"
            @update:model-value="(v) => setVisibilityField(v)"
          />
        </CoarFormField>
        <p v-if="hasInCondition" class="pb-props__hint">
          {{ t('coar.pageBuilder.props.visibleWhenIn', undefined, 'Multi-value condition (in) — edit it in the JSON tab.') }}
        </p>
        <CoarFormField
          v-else-if="visibleWhen"
          :label="t('coar.pageBuilder.props.visibleWhenEquals', undefined, 'equals')"
        >
          <CoarSelect
            v-if="conditionValueOptions"
            :model-value="equalsDisplay"
            :options="conditionValueOptions"
            @update:model-value="(v) => setVisibilityEquals(v)"
          />
          <CoarTextInput
            v-else
            :model-value="equalsDisplay"
            @update:model-value="(v) => setVisibilityEquals(v)"
          />
        </CoarFormField>
      </section>

      <!-- ── Universal style section ─────────────────────────────────────── -->
      <section
        v-if="!def?.builder?.hideStyleSection"
        class="pb-props__section"
        :class="{ 'pb-props__section--separated': !!inspector || !!fieldNode || !!pageNode || showVisibility }"
      >
        <h4 class="pb-props__section-title">{{ t('coar.pageBuilder.props.section.style', undefined, 'Style') }}</h4>
        <StyleProps :node="node" :container="isContainer" :patch-style="patchStyle" />
      </section>
    </div>
  </aside>
</template>

<style scoped>
.pb-props {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--coar-surface-default, #fff);
  font-family: var(--coar-body-base-family, sans-serif);
}

.pb-props__header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
  height: 44px;
  box-sizing: border-box;
  border-bottom: 1px solid var(--coar-border-neutral, #e2e2e6);
  color: var(--coar-text-neutral-secondary, #5a5a60);
  flex-shrink: 0;
}

.pb-props__title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--coar-text-neutral-secondary, #5a5a60);
}

.pb-props__body {
  flex: 1;
  overflow: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.pb-props__section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pb-props__section--separated {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--coar-border-neutral-subtle, #eeeef0);
}

.pb-props__section-title {
  margin: 0;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--coar-text-neutral-tertiary, #8a8a90);
}

.pb-props__empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 32px 16px;
  color: var(--coar-icon-neutral-disabled, #b0b0b6);
  text-align: center;
}

.pb-props__empty-title {
  margin: 8px 0 0;
  font-size: var(--coar-body-small-base-size, 14px);
  font-weight: 500;
  color: var(--coar-text-neutral-secondary, #5a5a60);
}

.pb-props__empty-hint {
  margin: 0;
  font-size: var(--coar-body-caption-size, 12px);
  color: var(--coar-text-neutral-tertiary, #8a8a90);
}

.pb-props__hint {
  margin: 0;
  font-size: var(--coar-body-caption-size, 12px);
  color: var(--coar-text-neutral-tertiary, #8a8a90);
}

.pb-props__issues {
  list-style: none;
  padding: 0;
  margin: 0 0 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pb-props__issue {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.4;
}

.pb-props__issue--warning {
  background: var(--coar-surface-semantic-warning-subtle, #fef3c7);
  color: var(--coar-text-semantic-warning-bold, #92400e);
}

.pb-props__issue--error {
  background: var(--coar-surface-semantic-error-subtle, #fde8e4);
  color: var(--coar-text-semantic-error-bold, #c0392b);
}
</style>
