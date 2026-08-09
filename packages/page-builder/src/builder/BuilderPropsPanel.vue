<script setup lang="ts">
import { computed, inject } from 'vue';
import { useI18n } from '@cocoar/vue-localization';
import {
  CoarIcon,
  CoarFormField,
  CoarTextInput,
  CoarCheckbox,
  CoarSelect,
  CoarButton,
  type CoarSelectOption,
} from '@cocoar/vue-ui';
import type { LocalizedValue, PageBreakpoint, PageNode, NodeStyle, ElementNode, FieldValidation, PageRootNode, PageTranslations, PropertyBinding, RepeatNode, RuntimeBinding, RuntimeExpressionBinding, TranslationBinding, VisibleWhen } from '../schema';
import { BUILDER_API, BUILDER_AUTHORING_MODE, BUILDER_BREAKPOINT, BUILDER_COMPOSITIONS, BUILDER_CONFIG, BUILDER_LOCALE, BUILDER_LOGIC, BUILDER_PAGE_CODE_VALUES, BUILDER_VALIDATION } from './builderContext';
import type { NodePath } from './operations';
import { useMergedElements } from '../elements/useMergedElements';
import { compatibleFields, compatibleElementTypes } from '../elements/fieldContract';
import { isElementAllowed } from '../schema';
import StyleProps from './props/StyleProps.vue';
import ActionPropsEditor from './props/ActionPropsEditor.vue';
import { isExpressionBinding } from '../runtimeBindings';
import { expressionLiteral } from './expressionAuthoring';
import { collectElementNames, elementNameBase, uniqueElementName } from './nodeDefaults';
import { readElementQuickProperties, setElementQuickProperty, setPageRootQuickProperty } from '../pageCode';
import {
  PAGE_ROOT_QUICK_PROPERTIES,
  isQuickCompound,
  type PageElementQuickCompound,
  type PageElementQuickEntry,
  type PageElementQuickProperty,
} from '../elements/registry';
import CompoundLengthProperty from './props/CompoundLengthProperty.vue';
import { isTranslationBinding, pageTranslationTemplate, translation, translationKeyFor } from '../translations';
import { isBindableActionValueField } from '../actionValues';

defineOptions({ name: 'BuilderPropsPanel' });

const { t } = useI18n();

const builder = inject(BUILDER_API)!;
const config = inject(BUILDER_CONFIG);
const validation = inject(BUILDER_VALIDATION);
const activeBreakpoint = inject(BUILDER_BREAKPOINT)!;
const elements = useMergedElements(config);
const logic = inject(BUILDER_LOGIC);
const pageCodeValues = inject(BUILDER_PAGE_CODE_VALUES);
const builderLocale = inject(BUILDER_LOCALE);
const authoringMode = inject(BUILDER_AUTHORING_MODE, computed(() => 'properties' as const));
const compositions = inject(BUILDER_COMPOSITIONS);
const codeDriven = computed(() => authoringMode.value === 'code');

const node = computed(() => builder.selectedNode.value);
const path = computed(() => builder.selectedPath.value ?? []);
const selectedCompositionRoot = computed(() => {
  const link = compositions?.selectedLink.value;
  if (!link || link.path.length !== path.value.length) return null;
  return link.path.every((part, index) => part === path.value[index]) ? link : null;
});
const selectedCompositionName = computed(() =>
  compositions?.selectedSummary.value?.name ?? selectedCompositionRoot.value?.reference.id ?? '',
);
const selectedCompositionVersions = computed<CoarSelectOption<string>[]>(() => {
  const link = selectedCompositionRoot.value;
  if (!link) return [];
  const versions = compositions?.selectedSummary.value?.versions ?? [link.reference.version];
  return [...new Set([link.reference.version, ...versions])].map((version) => ({ value: version, label: version }));
});

/** Registry definition for the selected node (undefined for `page`). */
const def = computed(() => (node.value ? elements.value[node.value.type] : undefined));

/** The selected node, narrowed to the element grammar when it participates in the value model. */
const fieldNode = computed<ElementNode | null>(() =>
  node.value && def.value?.value ? (node.value as ElementNode) : null,
);

const inspector = computed(() => def.value?.builder?.inspector);
const defaultValueInput = computed(() => def.value?.builder?.defaultValueInput);
// The page root is not a registered element, so its shortcuts come from the
// registry constant. Both write into their own code draft's Quick Properties
// block, which uses one shared metadata format.
const quickProperties = computed<readonly PageElementQuickEntry[]>(() =>
  pageNode.value ? PAGE_ROOT_QUICK_PROPERTIES : def.value?.builder?.quickProperties ?? [],
);
const quickPropertyValues = computed(() => readElementQuickProperties(
  pageNode.value ? pageNode.value.rootCode : elementNode.value?.elementCode,
));

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
  if (activeBreakpoint.value === 'compact') {
    const next = { ...(node.value.style ?? {}), ...update };
    for (const key of Object.keys(next) as (keyof NodeStyle)[]) if (next[key] === undefined) delete next[key];
    patch({ style: Object.keys(next).length ? next : undefined } as Partial<PageNode>);
    return;
  }
  const breakpoint = activeBreakpoint.value as Exclude<PageBreakpoint, 'compact'>;
  const nextLocal = { ...(node.value.responsive?.[breakpoint] ?? {}), ...update };
  for (const key of Object.keys(nextLocal) as (keyof NodeStyle)[]) if (nextLocal[key] === undefined) delete nextLocal[key];
  const responsive = { ...(node.value.responsive ?? {}) };
  if (Object.keys(nextLocal).length) responsive[breakpoint] = nextLocal;
  else delete responsive[breakpoint];
  patch({ responsive: Object.keys(responsive).length ? responsive : undefined } as Partial<PageNode>);
}

function quickPropertyRawValue(property: PageElementQuickProperty): unknown {
  const authored = quickPropertyValues.value;
  if (Object.prototype.hasOwnProperty.call(authored, property.path)) return authored[property.path];
  const [root, key] = property.path.split('.') as [string, string];
  // No assignment yet: show the value the document already carries, so the
  // field reflects what the canvas renders instead of looking unset.
  if (pageNode.value) {
    return root === 'style' ? pageNode.value.style?.[key as keyof NodeStyle] : undefined;
  }
  const current = elementNode.value;
  if (!current) return undefined;
  if (root === 'props') return current.props[key];
  if (root === 'style') return current.style?.[key as keyof NodeStyle];
  if (root === 'validation') return current.validation?.[key as keyof FieldValidation];
  return undefined;
}

const activeBuilderLocale = computed(() => builderLocale?.active.value
  ?? config?.value?.defaultLocale
  ?? config?.value?.locales?.[0]?.id
  ?? 'en');
const pageTranslations = computed(() => builder.schema.value.type === 'page'
  ? (builder.schema.value as PageRootNode).translations ?? {}
  : {});

function localizedText(value: LocalizedValue<string>): string {
  return value.localized[activeBuilderLocale.value]
    ?? value.fallback
    ?? Object.values(value.localized)[0]
    ?? '';
}

function quickPropertyLabel(property: PageElementQuickProperty): string {
  return t(property.label.key, undefined, property.label.fallback);
}

function quickPropertyValue(property: PageElementQuickProperty): unknown {
  const value = quickPropertyRawValue(property);
  if (isTranslationBinding(value)) {
    return pageTranslationTemplate(
      pageTranslations.value,
      value.key,
      activeBuilderLocale.value,
      config?.value?.defaultLocale,
    ) ?? value.fallback ?? value.key;
  }
  return isLocalized(value) ? localizedText(value) : value;
}

function quickPropertyOptions(property: PageElementQuickProperty): CoarSelectOption<string>[] {
  return (property.options ?? []).map((option) => ({
    value: option.value,
    label: t(option.label.key, undefined, option.label.fallback),
  }));
}

function updateQuickProperty(property: PageElementQuickProperty, value: unknown) {
  if (pageNode.value) {
    patch({
      rootCode: setPageRootQuickProperty(pageNode.value.rootCode, property.path, value),
    } as Partial<PageNode>);
    return;
  }
  const current = elementNode.value;
  if (!current) return;
  const existing = quickPropertyRawValue(property);
  let nextValue = value;
  if (property.valueKind === 'localized-text') {
    const key = isTranslationBinding(existing)
      ? existing.key
      : translationKeyFor(current.name ?? current.id, property.path);
    const defaultLocale = config?.value?.defaultLocale ?? config?.value?.locales?.[0]?.id ?? 'en';
    const messages: PageTranslations = { ...pageTranslations.value };
    if (isLocalized(existing)) {
      for (const [locale, text] of Object.entries(existing.localized)) {
        messages[locale] = { ...(messages[locale] ?? {}), [key]: text };
      }
    } else if (typeof existing === 'string' && messages[defaultLocale]?.[key] === undefined) {
      messages[defaultLocale] = { ...(messages[defaultLocale] ?? {}), [key]: existing };
    }
    messages[activeBuilderLocale.value] = {
      ...(messages[activeBuilderLocale.value] ?? {}),
      [key]: String(value ?? ''),
    };
    builder.patch([], { translations: messages });
    const fallback = isTranslationBinding(existing)
      ? existing.fallback
      : isLocalized(existing)
        ? existing.fallback
        : typeof existing === 'string' ? existing : String(value ?? '');
    nextValue = translation(key, undefined, fallback);
  }
  patch({
    elementCode: setElementQuickProperty(current.elementCode, property.path, nextValue),
  } as Partial<PageNode>);
}

function quickTranslationBinding(property: PageElementQuickProperty): TranslationBinding | undefined {
  const value = quickPropertyRawValue(property);
  return isTranslationBinding(value) ? value : undefined;
}

function resetQuickProperty(property: PageElementQuickProperty) {
  if (pageNode.value) {
    patch({
      rootCode: setPageRootQuickProperty(pageNode.value.rootCode, property.path, undefined),
    } as Partial<PageNode>);
    return;
  }
  const current = elementNode.value;
  if (!current) return;
  patch({
    elementCode: setElementQuickProperty(current.elementCode, property.path, undefined),
  } as Partial<PageNode>);
}

function hasQuickProperty(property: PageElementQuickProperty): boolean {
  return Object.prototype.hasOwnProperty.call(quickPropertyValues.value, property.path);
}

// ─── Compound (grouped length) properties ────────────────────────────────────

/** Every path a compound owns, whether bundled or shorthand-backed. */
function compoundPaths(compound: PageElementQuickCompound): string[] {
  if (compound.shorthand) return [compound.shorthand];
  const paths: string[] = [];
  for (const part of compound.parts) if (part.path) paths.push(part.path);
  return paths;
}

/**
 * Same fallback as single properties: with no assignment yet, show the value
 * the document already carries so the summary matches what the canvas renders.
 */
function readStylePath(path: string): string {
  const authored = quickPropertyValues.value;
  if (Object.prototype.hasOwnProperty.call(authored, path)) {
    const value = authored[path];
    return value === undefined || value === null ? '' : String(value);
  }
  const key = path.slice('style.'.length) as keyof NodeStyle;
  const current = pageNode.value ? pageNode.value.style : elementNode.value?.style;
  const value = current?.[key];
  return value === undefined || value === null ? '' : String(value);
}

function writeStylePath(path: string, value: string) {
  writeQuickAssignment(path, value === '' ? '' : value);
}

/** Compounds are style-only, so both node kinds route through their own code draft. */
function writeQuickAssignment(path: string, value: unknown) {
  if (pageNode.value) {
    patch({ rootCode: setPageRootQuickProperty(pageNode.value.rootCode, path, value) } as Partial<PageNode>);
    return;
  }
  const current = elementNode.value;
  if (!current) return;
  patch({ elementCode: setElementQuickProperty(current.elementCode, path, value) } as Partial<PageNode>);
}

function hasCompound(compound: PageElementQuickCompound): boolean {
  return compoundPaths(compound).some(
    (path) => Object.prototype.hasOwnProperty.call(quickPropertyValues.value, path),
  );
}

function resetCompound(compound: PageElementQuickCompound) {
  for (const path of compoundPaths(compound)) {
    if (!Object.prototype.hasOwnProperty.call(quickPropertyValues.value, path)) continue;
    writeQuickAssignment(path, undefined);
  }
}

// ─── Runtime property bindings ───────────────────────────────────────────────
const elementNode = computed<ElementNode | null>(() => node.value && node.value.type !== 'page' ? node.value as ElementNode : null);
const bindingEntries = computed(() => Object.entries(elementNode.value?.bindings ?? {}));
const bindableTargets = computed<CoarSelectOption<string>[]>(() => {
  const keys = new Set(['text', 'label', 'placeholder', 'title', 'disabled', 'assetId', 'alt', 'actionValue']);
  for (const key of Object.keys(elementNode.value?.props ?? {})) {
    if (key !== 'action' && key !== 'actionValues' && key !== 'actionValueField') keys.add(key);
  }
  const actionValues = elementNode.value?.props.actionValues;
  if (actionValues && typeof actionValues === 'object' && !Array.isArray(actionValues)) {
    for (const key of Object.keys(actionValues)) {
      if (isBindableActionValueField(key)) keys.add(`actionValues.${key}`);
    }
  }
  return [...keys].map((key) => ({ value: key, label: key }));
});
const STYLE_EXPRESSION_TARGETS = [
  'width', 'minWidth', 'maxWidth', 'height', 'minHeight', 'maxHeight', 'aspectRatio', 'overflow', 'padding', 'gap',
  'hidden', 'fontSize', 'fontWeight', 'fontStyle', 'fontVariationSettings', 'textAlign', 'textDecoration', 'surface', 'foreground',
] as const;
const expressionTargets = computed<CoarSelectOption<string>[]>(() => [
  ...bindableTargets.value,
  ...STYLE_EXPRESSION_TARGETS.map((key) => ({ value: `style.${key}`, label: `style.${key}` })),
]);
const contextPathOptions = computed<CoarSelectOption<string>[]>(() =>
  (config?.value?.contextFields ?? []).map((field) => ({ value: field.path, label: `${field.path} · ${field.type}` })),
);
const nearestRepeat = computed<RepeatNode | undefined>(() => {
  let current = builder.schema.value;
  let found: RepeatNode | undefined;
  for (const index of path.value) {
    if (current.type === 'repeat') found = current as RepeatNode;
    const children = 'children' in current && Array.isArray(current.children) ? current.children : [];
    current = children[index];
    if (!current) break;
  }
  return found;
});
const itemPathOptions = computed<CoarSelectOption<string>[]>(() => {
  const source = nearestRepeat.value?.props.source;
  const contract = config?.value?.contextFields?.find((field) => field.path === source);
  return (contract?.itemFields ?? []).map((field) => ({ value: field.path, label: `${field.path} · ${field.type}` }));
});
function collectTreeOptions(kind: 'field' | 'selection'): CoarSelectOption<string>[] {
  const found = new Set<string>();
  const visit = (entry: PageNode) => {
    if (entry.type !== 'page') {
      const element = entry as ElementNode;
      const definition = elements.value[entry.type];
      if (kind === 'field' && definition?.value && element.name && element.name !== '$selection') {
        found.add(element.name);
      }
      if (kind === 'selection' && entry.type === 'repeat') {
        const selectionName = (entry as RepeatNode).props.selection?.name;
        if (selectionName) found.add(selectionName);
      }
    }
    if ('children' in entry && Array.isArray(entry.children)) entry.children.forEach(visit);
  };
  visit(builder.schema.value);
  return [...found].map((value) => ({ value, label: value }));
}
const fieldPathOptions = computed(() => collectTreeOptions('field'));
const selectionPathOptions = computed(() => collectTreeOptions('selection'));
const statePathOptions = computed<CoarSelectOption<string>[]>(() => {
  const paths: string[] = [];
  const collect = (value: unknown, prefix = '', depth = 0) => {
    if (!value || typeof value !== 'object' || Array.isArray(value) || depth > 8) return;
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(key) || ['__proto__', 'prototype', 'constructor'].includes(key)) continue;
      const path = prefix ? `${prefix}.${key}` : key;
      paths.push(path);
      collect(entry, path, depth + 1);
    }
  };
  collect(pageCodeValues?.value?.state);
  return paths.map((value) => ({ value, label: value }));
});
const bindingSourceOptions = computed<CoarSelectOption<RuntimeBinding['source']>[]>(() => [
  ...(contextPathOptions.value.length ? [{ value: 'context' as const, label: 'Host context' }] : []),
  { value: 'state', label: 'Page state' },
  ...(fieldPathOptions.value.length ? [{ value: 'field' as const, label: 'Form field' }] : []),
  ...(selectionPathOptions.value.length ? [{ value: 'selection' as const, label: 'Repeat selection' }] : []),
  ...(nearestRepeat.value ? [
    { value: 'item' as const, label: `Repeat item (${nearestRepeat.value.props.itemAlias ?? 'item'})` },
    { value: 'index' as const, label: 'Repeat index' },
  ] : []),
]);

function patchBindings(next: Record<string, PropertyBinding>) {
  patch({ bindings: Object.keys(next).length ? next : undefined } as Partial<PageNode>);
}
function addBinding() {
  const used = new Set(bindingEntries.value.map(([key]) => key));
  const target = bindableTargets.value.find((entry) => !used.has(entry.value))?.value;
  if (!target) return;
  const source = bindingSourceOptions.value[0]?.value ?? 'state';
  const firstPath = source === 'context' ? contextPathOptions.value[0]?.value : undefined;
  patchBindings({ ...(elementNode.value?.bindings ?? {}), [target]: { source, path: firstPath } });
}
function staticTargetValue(target: string): unknown {
  const element = elementNode.value;
  if (!element) return undefined;
  if (target.startsWith('style.')) return element.style?.[target.slice(6) as keyof NodeStyle];
  if (target.startsWith('actionValues.')) {
    const actionValues = element.props.actionValues;
    return actionValues && typeof actionValues === 'object' && !Array.isArray(actionValues)
      ? (actionValues as Record<string, unknown>)[target.slice('actionValues.'.length)]
      : undefined;
  }
  return element.props?.[target];
}
function addExpressionBinding() {
  const used = new Set(bindingEntries.value.map(([key]) => key));
  const target = expressionTargets.value.find((entry) => !used.has(entry.value))?.value;
  if (!target) return;
  const binding: RuntimeExpressionBinding = {
    source: 'expression',
    enabled: true,
    expression: expressionLiteral(staticTargetValue(target)),
  };
  patchBindings({ ...(elementNode.value?.bindings ?? {}), [target]: binding });
}
function removeBinding(target: string) {
  const next = { ...(elementNode.value?.bindings ?? {}) };
  delete next[target];
  patchBindings(next);
}
function renameBinding(from: string, to: string | null) {
  if (!to || to === from) return;
  const next = { ...(elementNode.value?.bindings ?? {}) };
  next[to] = next[from];
  delete next[from];
  patchBindings(next);
}
function directBinding(binding: PropertyBinding): RuntimeBinding | null {
  return 'source' in binding
    && (binding.source === 'context' || binding.source === 'state' || binding.source === 'item'
      || binding.source === 'index' || binding.source === 'field' || binding.source === 'selection')
    ? binding
    : null;
}
function expressionBinding(binding: PropertyBinding): RuntimeExpressionBinding | null {
  return isExpressionBinding(binding) ? binding : null;
}
function editExpression(target: string) {
  if (elementNode.value) logic?.openBinding(elementNode.value.id, target);
}
function setExpressionEnabled(target: string, enabled: boolean) {
  const current = elementNode.value?.bindings?.[target];
  if (!current || !isExpressionBinding(current)) return;
  patchBindings({
    ...(elementNode.value?.bindings ?? {}),
    [target]: { ...current, enabled },
  });
}
function updateBinding(target: string, update: Partial<RuntimeBinding>) {
  const current = directBinding(elementNode.value?.bindings?.[target] ?? { source: 'context' });
  const next: RuntimeBinding = { source: current?.source ?? 'context', ...current, ...update };
  patchBindings({ ...(elementNode.value?.bindings ?? {}), [target]: next });
}
function bindingPaths(binding: PropertyBinding): CoarSelectOption<string>[] {
  const direct = directBinding(binding);
  if (direct?.source === 'item') return itemPathOptions.value;
  if (direct?.source === 'state') return statePathOptions.value;
  if (direct?.source === 'field') return fieldPathOptions.value;
  if (direct?.source === 'selection') return selectionPathOptions.value;
  return contextPathOptions.value;
}
function bindingNeedsPath(binding: PropertyBinding): boolean {
  const source = directBinding(binding)?.source;
  return source !== 'index';
}

// ─── Localized string props ──────────────────────────────────────────────────
function isLocalized(value: unknown): value is LocalizedValue<string> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !('localized' in value)) return false;
  const localized = (value as { localized?: unknown }).localized;
  return !!localized && typeof localized === 'object' && !Array.isArray(localized);
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
// Contract fields are optional presets for the always-editable public name.
// Selecting one also applies its label/required metadata; free text remains
// authoritative so custom form properties and non-contract use cases work.

const contractFields = computed(() => config?.value?.fields);
const useFieldSelect = computed(() => (contractFields.value?.length ?? 0) > 0);
const allowCustom = computed(() => config?.value?.allowCustomFields === true);
const CUSTOM_NAME_SOURCE = '\u0000page-builder-custom-name';

const fieldOptions = computed<CoarSelectOption<string>[]>(() => {
  if (!contractFields.value || !def.value) return [];
  return compatibleFields(def.value, contractFields.value).map((f) => ({
    value: f.name,
    label: f.label ? `${f.label} (${f.name})` : f.name,
  }));
});

const selectedContractFieldName = computed(() => {
  const name = fieldNode.value?.name;
  return name && fieldOptions.value.some((field) => field.value === name) ? name : null;
});

const customNameActive = computed(() => !!fieldNode.value && selectedContractFieldName.value === null);
const customNameInputId = computed(() => `pb-custom-name-${node.value?.id ?? 'element'}`);
const defaultElementProps = computed<Record<string, unknown>>(() =>
  (def.value?.builder?.defaults?.() as Record<string, unknown> | undefined) ?? {},
);
const customNameSupportsLabel = computed(() => {
  if (!fieldNode.value) return false;
  return 'label' in (fieldNode.value.props ?? {}) || 'label' in defaultElementProps.value;
});
const customNameLabel = computed(() => {
  const value = fieldNode.value?.props?.label;
  if (typeof value === 'string') return value;
  if (isTranslationBinding(value)) {
    return pageTranslationTemplate(pageTranslations.value, value.key, activeBuilderLocale.value, config?.value?.defaultLocale)
      ?? value.fallback
      ?? value.key;
  }
  if (isLocalized(value)) {
    const defaultLocale = config?.value?.defaultLocale;
    return (defaultLocale && value.localized[defaultLocale])
      ?? value.fallback
      ?? Object.values(value.localized)[0]
      ?? '';
  }
  const fallback = defaultElementProps.value.label;
  return typeof fallback === 'string' ? fallback : '';
});
const nameSourceOptions = computed<CoarSelectOption<string>[]>(() => [
  ...fieldOptions.value,
  {
    value: CUSTOM_NAME_SOURCE,
    label: t('coar.pageBuilder.props.customName', undefined, 'Custom name…'),
    // A host may enforce a closed DTO contract. Existing invalid/custom
    // documents must still expose their current mode so the author can fix it.
    disabled: !allowCustom.value && !customNameActive.value,
  },
]);

function setNameSource(value: string | null) {
  if (!value) return;
  if (value !== CUSTOM_NAME_SOURCE) {
    bindField(value);
    return;
  }
  if (!elementNode.value || customNameActive.value) return;
  const used = collectElementNames(builder.schema.value);
  if (elementNode.value.name) used.delete(elementNode.value.name);
  patch({
    name: uniqueElementName(elementNameBase(elementNode.value.type), used),
  });
}

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
const visibilitySource = computed(() => visibleWhen.value?.source ?? (visibleWhen.value?.field ? 'field' : ''));
const visibilitySourceOptions = computed<CoarSelectOption<string>[]>(() => [
  { value: '', label: 'Always visible' },
  { value: 'field', label: 'Form field' },
  { value: 'context', label: 'Host context' },
  { value: 'state', label: 'View state' },
  ...(nearestRepeat.value ? [{ value: 'item', label: `Repeat item (${nearestRepeat.value.props.itemAlias ?? 'item'})` }] : []),
]);
const conditionOperatorOptions = computed<CoarSelectOption<string>[]>(() => [
  { value: 'equals', label: 'equals' },
  { value: 'notEquals', label: 'does not equal' },
  { value: 'exists', label: 'exists' },
  { value: 'isEmpty', label: 'is empty' },
  { value: 'isNotEmpty', label: 'is not empty' },
]);
const stateOptions = computed<CoarSelectOption<string>[]>(() =>
  (config?.value?.availableStates ?? []).map((state) => ({ value: state.id, label: state.label })),
);

function setVisibilitySource(source: string | null) {
  if (!source) { patch({ visibleWhen: undefined } as Partial<PageNode>); return; }
  if (source === 'field') {
    const first = controllerOptions.value[0]?.value;
    patch({ visibleWhen: first ? { field: first, equals: true } : { source: 'field', path: '', operator: 'exists' } } as Partial<PageNode>);
    return;
  }
  if (source === 'context') {
    patch({ visibleWhen: { source: 'context', path: contextPathOptions.value[0]?.value ?? '', operator: 'exists' } } as Partial<PageNode>);
    return;
  }
  if (source === 'item') {
    patch({ visibleWhen: { source: 'item', path: itemPathOptions.value[0]?.value ?? '', operator: 'exists' } } as Partial<PageNode>);
    return;
  }
  patch({ visibleWhen: { source: 'state', operator: 'equals', value: stateOptions.value[0]?.value ?? '' } } as Partial<PageNode>);
}

function patchExtendedCondition(update: Partial<VisibleWhen>) {
  patch({ visibleWhen: { ...(visibleWhen.value ?? {}), ...update } } as Partial<PageNode>);
}

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
 * never matches the number 18 a number-input writes. The bound contract
 * field's valueType is authoritative (multi-type elements store whatever
 * their bound field says); without a binding, only an UNAMBIGUOUS single-type
 * declaration is trusted — everything else authors strings.
 */
type ControllerKind = 'boolean' | 'number' | 'string';
function kindOf(c: ElementNode | null): ControllerKind {
  if (!c) return 'string';
  const bound = contractFields.value?.find((f) => f.name === c.name)?.valueType;
  if (bound === 'boolean') return 'boolean';
  if (bound === 'number') return 'number';
  if (bound) return 'string';
  const types = elements.value[c.type]?.value?.types;
  if (types?.length === 1 && types[0] === 'boolean') return 'boolean';
  if (types?.length === 1 && types[0] === 'number') return 'number';
  return 'string';
}

/**
 * Named inputs on the page (minus this node) — candidates for the controlling
 * field. Array-valued controllers (`string[]`) are not OFFERED: an `equals`
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
  // A pre-existing (JSON-authored) reference stays selected: plain label when
  // the field exists on the page (e.g. an excluded array-valued one), `(?)`
  // only when it genuinely isn't there (lint flags that case).
  const current = visibleWhen.value?.field;
  if (current && !out.some((o) => o.value === current)) {
    out.push({
      value: current,
      label: findController(current) ? current : `${current} (?)`,
    });
  }
  return out;
});

const controller = computed(() =>
  visibleWhen.value?.field ? findController(visibleWhen.value.field) : null,
);

/** Array-valued controller (`string[]`): `equals` cannot match — JSON-authoring only. */
const controllerIsArray = computed(() => {
  const c = controller.value;
  if (!c) return false;
  const bound = contractFields.value?.find((f) => f.name === c.name)?.valueType;
  if (bound) return bound === 'string[]';
  return !!elements.value[c.type]?.value?.types?.includes('string[]');
});

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
  if (!name) return;
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
  <aside
    class="pb-props"
    :aria-label="t('coar.pageBuilder.props.panelTitle', undefined, 'Properties')"
  >
    <header class="pb-props__header">
      <CoarIcon name="settings" size="xs" />
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
            size="xs"
          />
          <span>{{ issue.message }}</span>
        </li>
      </ul>

      <section v-if="selectedCompositionRoot && compositions" class="pb-props__section pb-props__composition" data-testid="composition-properties">
        <div class="pb-props__section-heading">
          <h4 class="pb-props__section-title">Composition</h4>
          <CoarIcon name="copy" size="xs" />
        </div>
        <CoarFormField layout="inline" label="Name">
          <CoarTextInput size="xs" :model-value="selectedCompositionName" disabled />
        </CoarFormField>
        <CoarFormField layout="inline" label="Pinned version">
          <CoarSelect
            size="xs"
            :model-value="selectedCompositionRoot.reference.version"
            :options="selectedCompositionVersions"
            sort-options="none"
            :disabled="compositions.busy.value"
            @update:model-value="(version) => version && compositions?.update(version)"
          />
        </CoarFormField>
        <p class="pb-props__hint"><code>{{ selectedCompositionRoot.reference.id }}</code></p>
        <p v-if="compositions.error.value" class="pb-props__composition-error" role="alert">{{ compositions.error.value }}</p>
        <div class="pb-props__composition-actions">
          <CoarButton
            size="xs"
            :disabled="compositions.busy.value || compositions.selectedIsLatest.value"
            @click="compositions.update()"
          >{{ compositions.selectedIsLatest.value ? 'Up to date' : 'Update to latest' }}</CoarButton>
          <CoarButton size="xs" variant="secondary" :disabled="compositions.busy.value" @click="compositions.detach()">Detach</CoarButton>
          <CoarButton size="xs" variant="secondary" :disabled="compositions.busy.value" @click="compositions.openSelected()">Open composition</CoarButton>
        </div>
      </section>

      <template v-if="codeDriven">
        <section class="pb-props__section">
          <h4 class="pb-props__section-title">Structure</h4>
          <template v-if="pageNode">
            <CoarFormField layout="inline" label="Element">
              <CoarTextInput size="xs" model-value="Page" disabled />
            </CoarFormField>
            <p class="pb-props__hint">
              Shared customer-authored data is configured as Page State. Element behavior stays with each element.
            </p>
            <CoarButton size="xs" variant="secondary" @click="logic?.openPageState()">
              <CoarIcon name="code" size="xs" />
              Edit Page State
            </CoarButton>
            <CoarButton size="xs" variant="secondary" @click="logic?.openPageCode()">
              <CoarIcon name="code" size="xs" />
              {{ pageNode.rootCode ? 'Edit Page Code' : 'Add Page Code' }}
            </CoarButton>
          </template>
          <template v-else>
            <CoarFormField layout="inline" :label="t('coar.pageBuilder.props.elementType', undefined, 'Element')">
              <CoarSelect
                v-if="representationOptions.length > 0"
                size="xs"
                :model-value="node.type"
                :options="representationOptions"
                @update:model-value="(v) => convertRepresentation(v)"
              />
              <CoarTextInput v-else size="xs" :model-value="node.type" disabled />
            </CoarFormField>
            <CoarFormField
v-if="elementNode"
              layout="inline"
              :label="t('coar.pageBuilder.props.name', undefined, 'Name')"
            >
              <div class="pb-props__name-editor">
                <CoarSelect
                  v-if="fieldNode && useFieldSelect"
                  size="xs"
                  :model-value="selectedContractFieldName ?? CUSTOM_NAME_SOURCE"
                  :options="nameSourceOptions"
                  sort-options="none"
                  @update:model-value="setNameSource"
                />
                <CoarTextInput
                  v-if="!fieldNode || !useFieldSelect || customNameActive"
                  :id="customNameInputId"
                  size="xs"
                  :model-value="elementNode.name ?? ''"
                  @update:model-value="(v) => patch({ name: v })"
                />
                <label
                  v-if="fieldNode && useFieldSelect && customNameActive"
                  class="pb-props__sr-only"
                  :for="customNameInputId"
                >{{ t('coar.pageBuilder.props.customName', undefined, 'Custom name') }}</label>
              </div>
            </CoarFormField>
            <CoarFormField
v-if="customNameActive && customNameSupportsLabel"
              layout="inline"
              :label="t('coar.pageBuilder.props.label', undefined, 'Label')"
            >
              <CoarTextInput
                size="xs"
                :model-value="customNameLabel"
                @update:model-value="(v) => patch({ props: { label: v } } as Partial<PageNode>)"
              />
            </CoarFormField>
            <p class="pb-props__hint">
              All other values belong to this element's code. Code cannot change its type or name.
            </p>
            <CoarButton
              v-if="elementNode"
              size="xs"
              variant="secondary"
              @click="logic?.openElementCode(elementNode.id)"
            >
              <CoarIcon name="code" size="xs" />
              {{ elementNode.elementCode ? 'Edit element code' : 'Add element code' }}
            </CoarButton>
          </template>
        </section>

        <section
          v-if="quickProperties.length > 0"
          class="pb-props__section pb-props__section--separated"
        >
          <h4 class="pb-props__section-title">Quick properties</h4>
          <p class="pb-props__hint">
            These controls write locked assignments before your custom code. Custom code can override them.
          </p>
          <template v-for="(property, index) in quickProperties" :key="index">
          <CompoundLengthProperty
            v-if="isQuickCompound(property)"
            class="pb-props__quick-property"
            :compound="property"
            :assigned="hasCompound(property)"
            :read-path="readStylePath"
            :read-shorthand="() => readStylePath(property.shorthand!)"
            :write-path="writeStylePath"
            :write-shorthand="(v: string | undefined) => writeQuickAssignment(property.shorthand!, v)"
            :on-reset="() => resetCompound(property)"
          />
          <div
            v-else
            class="pb-props__quick-property"
          >
            <div class="pb-props__quick-control">
              <CoarCheckbox
                v-if="property.control === 'boolean'"
                size="xs"
                :model-value="!!quickPropertyValue(property)"
                :label="quickPropertyLabel(property)"
                @update:model-value="(v) => updateQuickProperty(property, v)"
              />
              <CoarFormField v-else layout="inline" :label="quickPropertyLabel(property)">
                <CoarSelect
                  v-if="property.control === 'select'"
                  size="xs"
                  :model-value="String(quickPropertyValue(property) ?? '')"
                  :options="quickPropertyOptions(property)"
                  sort-options="none"
                  @update:model-value="(v) => updateQuickProperty(property, v)"
                />
                <CoarTextInput
                  v-else
                  size="xs"
                  :model-value="String(quickPropertyValue(property) ?? '')"
                  @update:model-value="(v) => updateQuickProperty(property, v)"
                />
              </CoarFormField>
              <button
                v-if="property.valueKind === 'localized-text' && quickTranslationBinding(property)"
                type="button"
                class="pb-props__translation-link"
                :title="`Open ${quickTranslationBinding(property)?.key} in Translations`"
                @click="logic?.openTranslations(quickTranslationBinding(property)?.key)"
              >
                <CoarIcon name="globe" size="xs" />
                <code>{{ quickTranslationBinding(property)?.key }}</code>
              </button>
            </div>
            <button
              v-if="hasQuickProperty(property)"
              type="button"
              class="pb-props__quick-reset"
              :title="`Remove ${quickPropertyLabel(property)} assignment`"
              @click="resetQuickProperty(property)"
            >Reset</button>
          </div>
          </template>
        </section>

        <section
          v-if="inspector && def?.builder?.inspectorInCodeMode"
          class="pb-props__section pb-props__section--separated"
        >
          <h4 class="pb-props__section-title">{{ inspectorTitle }}</h4>
          <component :is="inspector" :node="node" :patch="patch" />
        </section>
      </template>

      <template v-else>

      <!-- ── Host-owned page section (root-level behavior) ───────────────── -->
      <section v-if="pageNode" class="pb-props__section">
        <h4 class="pb-props__section-title">{{ t('coar.pageBuilder.props.section.page', undefined, 'Page') }}</h4>
        <CoarCheckbox
size="xs"
          :model-value="!!pageNode.enterSubmits"
          :label="t('coar.pageBuilder.props.enterSubmits', undefined, 'Enter submits (fires the default button)')"
          @update:model-value="(v) => patch({ enterSubmits: v || undefined } as Partial<PageNode>)"
        />
      </section>

      <!-- Every non-form element still needs a public Page-Code name. -->
      <section v-if="elementNode && !fieldNode" class="pb-props__section">
        <h4 class="pb-props__section-title">{{ t('coar.pageBuilder.props.section.element', undefined, 'Element') }}</h4>
        <CoarFormField layout="inline" :label="t('coar.pageBuilder.props.name', undefined, 'Name')">
          <CoarTextInput
size="xs"
            :model-value="elementNode.name ?? ''"
            @update:model-value="(v) => patch({ name: v })"
          />
        </CoarFormField>
      </section>

      <!-- ── Host-owned field section (value-model participation) ────────── -->
      <section v-if="fieldNode" class="pb-props__section">
        <h4 class="pb-props__section-title">{{ t('coar.pageBuilder.props.section.field', undefined, 'Field') }}</h4>
        <CoarFormField layout="inline" :label="t('coar.pageBuilder.props.name', undefined, 'Name')">
          <div class="pb-props__name-editor">
            <CoarSelect
              v-if="useFieldSelect"
              size="xs"
              :model-value="selectedContractFieldName ?? CUSTOM_NAME_SOURCE"
              :options="nameSourceOptions"
              sort-options="none"
              @update:model-value="setNameSource"
            />
            <CoarTextInput
v-if="!useFieldSelect || customNameActive"
              :id="customNameInputId"
              size="xs"
              :model-value="fieldNode.name ?? ''"
              @update:model-value="(v) => patch({ name: v })"
            />
            <label
              v-if="useFieldSelect && customNameActive"
              class="pb-props__sr-only"
              :for="customNameInputId"
            >{{ t('coar.pageBuilder.props.customName', undefined, 'Custom name') }}</label>
          </div>
        </CoarFormField>
        <CoarFormField
v-if="representationOptions.length > 0"
          layout="inline"
          :label="t('coar.pageBuilder.props.elementType', undefined, 'Element')"
        >
          <CoarSelect
size="xs"
            :model-value="node.type"
            :options="representationOptions"
            @update:model-value="(v) => convertRepresentation(v)"
          />
        </CoarFormField>
        <CoarCheckbox
size="xs"
          :model-value="!!fieldNode.validation?.required"
          :label="t('coar.pageBuilder.props.required', undefined, 'Required')"
          @update:model-value="setRequired"
        />
        <CoarFormField layout="inline" :label="t('coar.pageBuilder.props.defaultValue', undefined, 'Default value')">
          <component
            :is="defaultValueInput"
            v-if="defaultValueInput"
            :model-value="fieldNode.defaultValue"
            :props="fieldNode.props"
            @update:model-value="(v: unknown) => patch({ defaultValue: v ?? undefined })"
          />
          <CoarTextInput
v-else
            size="xs"
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

      <!-- ── Universal action section (registry capability) ─────────────── -->
      <section
        v-if="def?.action && elementNode"
        class="pb-props__section pb-props__section--separated"
      >
        <h4 class="pb-props__section-title">{{ t('coar.pageBuilder.props.section.action', undefined, 'Action') }}</h4>
        <ActionPropsEditor :node="elementNode" :patch="patch" />
      </section>

      <!-- ── Safe host/item bindings ─────────────────────────────────────── -->
      <section
        v-if="elementNode"
        class="pb-props__section pb-props__section--separated"
      >
        <div class="pb-props__section-heading">
          <h4 class="pb-props__section-title">Runtime bindings</h4>
          <div class="pb-props__section-actions">
            <button type="button" class="pb-props__small-button" @click="addBinding">+ Value</button>
            <button type="button" class="pb-props__small-button" @click="addExpressionBinding">+ fx</button>
          </div>
        </div>
        <p v-if="bindingEntries.length === 0" class="pb-props__hint">
          Bind an element property to an allowlisted host value or repeat item field.
        </p>
        <div v-for="([target, binding]) in bindingEntries" :key="target" class="pb-props__binding">
          <CoarFormField layout="inline" label="Property">
            <CoarSelect size="xs" :model-value="target" :options="expressionBinding(binding) ? expressionTargets : bindableTargets" @update:model-value="(v) => renameBinding(target, v)" />
          </CoarFormField>
          <template v-if="directBinding(binding)">
            <CoarFormField layout="inline" label="Source">
              <CoarSelect
size="xs"
                :model-value="directBinding(binding)!.source"
                :options="bindingSourceOptions"
                @update:model-value="(v) => updateBinding(target, { source: v as RuntimeBinding['source'], path: undefined })"
              />
            </CoarFormField>
            <CoarFormField v-if="bindingNeedsPath(binding)" layout="inline" label="Allowed path">
              <CoarSelect
v-if="directBinding(binding)!.source !== 'state' || bindingPaths(binding).length > 0"
                size="xs"
                :model-value="directBinding(binding)!.path ?? null"
                :options="bindingPaths(binding)"
                @update:model-value="(v) => updateBinding(target, { path: v ?? undefined })"
              />
              <CoarTextInput
                v-else
                size="xs"
                :model-value="directBinding(binding)!.path ?? ''"
                placeholder="e.g. consent.checked"
                @update:model-value="(v) => updateBinding(target, { path: v || undefined })"
              />
            </CoarFormField>
          </template>
          <template v-else-if="expressionBinding(binding)">
            <div class="pb-props__expression-summary">
              <code :title="expressionBinding(binding)!.expression">
                {{ expressionBinding(binding)!.expression || '/* empty */' }}
              </code>
              <button
                type="button"
                class="pb-props__small-button"
                @click="setExpressionEnabled(target, expressionBinding(binding)!.enabled === false)"
              >
                {{ expressionBinding(binding)!.enabled === false ? 'Use fx' : 'Use static' }}
              </button>
              <button type="button" class="pb-props__small-button" @click="editExpression(target)">Edit JavaScript</button>
            </div>
          </template>
          <p v-else class="pb-props__hint">Localized template — edit placeholders in JSON.</p>
          <button type="button" class="pb-props__remove-binding" @click="removeBinding(target)">Remove binding</button>
        </div>
      </section>

      <!-- ── Conditional visibility (host vocabulary, every non-page node) ── -->
      <section
        v-if="showVisibility"
        class="pb-props__section"
        :class="{ 'pb-props__section--separated': !!inspector || !!fieldNode }"
      >
        <h4 class="pb-props__section-title">{{ t('coar.pageBuilder.props.section.visibility', undefined, 'Visibility') }}</h4>
        <CoarFormField layout="inline" :label="t('coar.pageBuilder.props.visibleWhenField', undefined, 'Visible when')">
          <CoarSelect
size="xs"
            :model-value="visibilitySource"
            :options="visibilitySourceOptions"
            @update:model-value="setVisibilitySource"
          />
        </CoarFormField>
        <CoarFormField v-if="visibilitySource === 'field'" layout="inline" label="Form field">
          <CoarSelect
size="xs"
            :model-value="visibleWhen?.field ?? null"
            :options="controllerOptions"
            clearable
            @update:model-value="setVisibilityField"
          />
        </CoarFormField>
        <template v-else-if="visibilitySource === 'context' || visibilitySource === 'item'">
          <CoarFormField layout="inline" :label="visibilitySource === 'item' ? 'Allowed item path' : 'Allowed context path'">
            <CoarSelect size="xs" :model-value="visibleWhen?.path ?? null" :options="visibilitySource === 'item' ? itemPathOptions : contextPathOptions" @update:model-value="(v) => patchExtendedCondition({ path: v ?? '' })" />
          </CoarFormField>
          <CoarFormField layout="inline" label="Operator">
            <CoarSelect size="xs" :model-value="visibleWhen?.operator ?? 'equals'" :options="conditionOperatorOptions" @update:model-value="(v) => patchExtendedCondition({ operator: v as VisibleWhen['operator'] })" />
          </CoarFormField>
          <CoarFormField v-if="visibleWhen?.operator === 'equals' || visibleWhen?.operator === 'notEquals'" layout="inline" label="Value (JSON primitive)">
            <CoarTextInput size="xs" :model-value="String(visibleWhen?.value ?? '')" @update:model-value="(v) => patchExtendedCondition({ value: v })" />
          </CoarFormField>
        </template>
        <CoarFormField v-else-if="visibilitySource === 'state'" layout="inline" label="View state">
          <CoarSelect size="xs" :model-value="String(visibleWhen?.value ?? '')" :options="stateOptions" @update:model-value="(v) => patchExtendedCondition({ value: v })" />
        </CoarFormField>
        <p v-if="visibilitySource === 'field' && hasInCondition" class="pb-props__hint">
          {{ t('coar.pageBuilder.props.visibleWhenIn', undefined, 'Multi-value condition (in) — edit it in the JSON tab.') }}
        </p>
        <p v-else-if="visibilitySource === 'field' && visibleWhen && controllerIsArray" class="pb-props__hint">
          {{ t('coar.pageBuilder.props.visibleWhenArray', undefined, '"equals" cannot match a multi-value field — author this condition in the JSON tab.') }}
        </p>
        <CoarFormField
v-else-if="visibilitySource === 'field' && visibleWhen"
          layout="inline"
          :label="t('coar.pageBuilder.props.visibleWhenEquals', undefined, 'equals')"
        >
          <CoarSelect
v-if="conditionValueOptions"
            size="xs"
            :model-value="equalsDisplay"
            :options="conditionValueOptions"
            @update:model-value="(v) => setVisibilityEquals(v)"
          />
          <CoarTextInput
v-else
            size="xs"
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
        <StyleProps :node="node" :container="isContainer" :patch-style="patchStyle" :patch-node="patch" />
      </section>
      </template>
    </div>
  </aside>
</template>

<style scoped>
.pb-props {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--coar-background-neutral-primary, #fff);
  font-family: var(--coar-body-base-family, sans-serif);
  font-weight: 400;
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
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.01em;
  color: var(--coar-text-neutral-secondary, #5a5a60);
}

.pb-props__body {
  flex: 1;
  overflow: auto;
  padding: 14px;
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
  border-top: 1px solid var(--coar-border-neutral-tertiary, #eeeef0);
}

.pb-props__section-title {
  margin: 0;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.01em;
  color: var(--coar-text-neutral-secondary, #666a72);
}

.pb-props__name-editor {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pb-props__quick-property {
  display: flex;
  align-items: center;
  gap: 6px;
}

/*
 * One row per property: label left, control right, on a shared column so the
 * controls line up down the whole panel. Stacked labels cost roughly twice the
 * height, which the inspector — the narrowest pane here — cannot spare.
 */
.pb-props :deep(.coar-form-field--inline) {
  width: 100%;
}
.pb-props :deep(.coar-form-field--inline .coar-form-field__body) {
  display: grid;
  grid-template-columns: minmax(0, 84px) minmax(0, 1fr);
  align-items: center;
  gap: 8px;
}
.pb-props :deep(.coar-form-field--inline .coar-form-field__label-cluster),
.pb-props :deep(.coar-form-field--inline .coar-form-field__label) {
  min-width: 0;
  font-size: 12px;
  line-height: 1.3;
  color: var(--coar-text-neutral-secondary, #5a5a60);
  overflow-wrap: anywhere;
}
/* Checkboxes carry their own label, so they span both columns. */
.pb-props :deep(.coar-form-field--inline .coar-form-field__control) {
  min-width: 0;
}

.pb-props__quick-control {
  flex: 1;
  min-width: 0;
}

.pb-props__quick-reset {
  flex: none;
  margin-bottom: 3px;
  padding: 2px 3px;
  border: 0;
  background: transparent;
  color: var(--coar-text-neutral-tertiary, #8a8a90);
  font: inherit;
  font-size: 10px;
  cursor: pointer;
}

.pb-props__quick-reset:hover {
  color: var(--coar-text-accent-primary, #1666cc);
}

.pb-props__translation-link {
  display: flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  margin-top: 3px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--coar-text-neutral-tertiary, #73737b);
  cursor: pointer;
  text-align: left;
}

.pb-props__translation-link:hover { color: var(--coar-text-accent-primary, #1666cc); }
.pb-props__translation-link code { overflow: hidden; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }

.pb-props__sr-only {
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

.pb-props__section-heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.pb-props__section-actions { display: flex; align-items: center; gap: 5px; }
.pb-props__composition { border-bottom: 1px solid var(--coar-border-neutral, #e2e2e6); padding-bottom: 14px; }
.pb-props__composition-actions { display: flex; flex-wrap: wrap; gap: 6px; }
.pb-props__composition-error { margin: 0; color: var(--coar-text-semantic-error-bold, #b42318); font-size: 11px; }
.pb-props__small-button, .pb-props__remove-binding {
  border: 1px solid var(--coar-border-neutral, #d0d0d5);
  border-radius: 5px;
  background: var(--coar-background-neutral-primary, #fff);
  color: var(--coar-text-accent-primary, #1666cc);
  font: inherit;
  font-size: 11px;
  cursor: pointer;
}
.pb-props__binding { display: flex; flex-direction: column; gap: 8px; padding: 10px; border: 1px solid var(--coar-border-neutral-tertiary, #eeeef0); border-radius: 6px; }
.pb-props__expression-summary { display: flex; flex-direction: column; gap: 7px; }
.pb-props__expression-summary code { display: block; max-height: 54px; overflow: hidden; padding: 6px; border-radius: 4px; background: var(--coar-background-neutral-secondary, #f7f7f9); color: var(--coar-text-neutral-secondary, #555); font-size: 10px; white-space: pre-wrap; overflow-wrap: anywhere; }
.pb-props__localized-key { font-size: 12px; color: var(--coar-text-neutral-primary, #222); }
.pb-props__remove-binding { align-self: flex-start; color: var(--coar-text-semantic-error-bold, #b42318); }

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
  background: var(--coar-background-semantic-warning-subtle, #fef3c7);
  color: var(--coar-text-semantic-warning-bold, #92400e);
}

.pb-props__issue--error {
  background: var(--coar-background-semantic-error-subtle, #fde8e4);
  color: var(--coar-text-semantic-error-bold, #c0392b);
}
</style>
