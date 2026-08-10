<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, provide, ref, toRaw, watch } from 'vue';
import {
  CoarIcon,
  CoarTabGroup,
  CoarTab,
  CoarThemeScope,
  useDialog,
  type CoarTheme,
  type CoarThemeMode,
} from '@cocoar/vue-ui';
import { useI18n, useLocalization } from '@cocoar/vue-localization';
import { CURRENT_PAGE_SCHEMA_VERSION, type ElementNode, type PageBreakpoint, type PageNode, type PageRootNode, type PageConfig, type RuntimeExpressionValues, type PageCompositionReference } from './schema';
import type { CoarScriptEditorExtraLib } from '@cocoar/vue-script-editor';
import type { PageCodeRuntimeValues } from './pageCode';
import { usePageCodeRuntime } from './runtime/usePageCodeRuntime';
import type { PageRuntimeHost } from './runtime/PageRuntimeHost';
import { PAGE_BREAKPOINT_WIDTHS, breakpointForWidth } from './responsive';
import { usePageBuilder } from './builder/usePageBuilder';
import { useMergedElements } from './elements/useMergedElements';
import { useAuthoringFindings, type AuthoringFinding } from './builder/useAuthoringFindings';
import { provideBuilderDnd } from './builder/useBuilderDnd';
import { useCanvasZoom, CANVAS_ZOOM_STEPS } from './builder/useCanvasZoom';
import BuilderZoomControl from './builder/props/BuilderZoomControl.vue';
import BuilderViewportControl from './builder/props/BuilderViewportControl.vue';
import { normalizePageSchema, type NormalizeIssue } from './builder/schemaNormalize';
import { warnDev } from './builder/operations';
import {
  BUILDER_API,
  BUILDER_CONFIG,
  BUILDER_FINDINGS,
  BUILDER_BREAKPOINT,
  BUILDER_RUNTIME,
  BUILDER_LOGIC,
  BUILDER_AUTHORING_MODE,
  BUILDER_PAGE_CODE_LIBS,
  BUILDER_PAGE_CODE_VALUES,
  BUILDER_LOCALE,
  BUILDER_COMPOSITIONS,
  type PageBuilderAuthoringMode,
} from './builder/builderContext';
import BuilderOutline from './builder/BuilderOutline.vue';
import BuilderCanvas from './builder/BuilderCanvas.vue';
import BuilderPalette from './builder/BuilderPalette.vue';
import BuilderPropsPanel from './builder/BuilderPropsPanel.vue';
import BuilderTranslationsPanel from './builder/BuilderTranslationsPanel.vue';
import BuilderCompositionsPanel from './builder/BuilderCompositionsPanel.vue';
import CoarPageRenderer from './CoarPageRenderer.vue';
import type { ActionHandler } from './context';
import type { ActionValues } from './context';
import { isExpressionBinding } from './runtimeBindings';
import type { NodePath } from './builder/operations';
import type { PageCompositionRepository } from './compositions';
import { usePageCompositions, type PageCompositionManagement } from './builder/usePageCompositions';

// Monaco is authoring-only and expensive. Both components are lazy: opening
// the builder and its property inspector does not request the editor chunk.
const BuilderLogicPanel = defineAsyncComponent(() => import('./builder/BuilderLogicPanel.vue'));
const BuilderExpressionDialog = defineAsyncComponent(() => import('./builder/BuilderExpressionDialog.vue'));
const BuilderElementCodeDialog = defineAsyncComponent(() => import('./builder/BuilderElementCodeDialog.vue'));
const BuilderPageRootCodeDialog = defineAsyncComponent(() => import('./builder/BuilderPageRootCodeDialog.vue'));

const { t } = useI18n();
const localization = useLocalization();

const model = defineModel<PageNode>({ required: false });
const emit = defineEmits<{
  /** Live field values from the embedded preview, useful for its sandbox session. */
  'preview-values': [values: ActionValues]
  'preview-runtime': [scope: {
    fields: ActionValues;
    form: { valid: boolean; dirty: boolean; validating: boolean; submitting: boolean };
  }]
  /** Host navigation hook for the independent composition definition editor. */
  'open-composition': [reference: PageCompositionReference]
  /**
   * The authoring findings the builder draws in its own outline and props
   * panel, mirrored to the host — a save button that greys out on errors, a
   * host-owned issue list, a telemetry hook. Fires on mount and whenever the
   * set changes in content (not merely in identity), so a keystroke that
   * leaves the findings alone stays quiet.
   *
   * These are AUTHORING hints, not the activation contract: for "may this
   * document go live?" use `validatePageDocument`, which the runtime honours.
   */
  findings: [findings: AuthoringFinding[]]
}>();

const props = defineProps<{
  /**
   * Security/allowlist config. The SAME config must also be passed to
   * `<CoarPageRenderer>` so disallowed elements are filtered both during
   * authoring (palette + add-child menu) and at render time (security boundary).
   */
  config?: PageConfig
  /** Safe sample context used only by the embedded preview; never persisted. */
  previewContext?: Record<string, unknown>
  /**
   * Field values the embedded preview starts from, merged OVER the schema's
   * own `defaultValue`s exactly as at runtime. This is the edit-form case —
   * and the case where the host computes a default the author did not write,
   * such as a per-tenant "remember me" setting. Without it the preview can
   * only ever show an empty form.
   */
  previewInitialValues?: ActionValues
  previewLocale?: string
  /** Host-owned theme applied only to the embedded renderer canvas. */
  previewTheme?: CoarTheme
  /** Preview colour mode. `auto` follows the surrounding application/OS mode. */
  previewThemeMode?: CoarThemeMode
  previewActions?: Record<string, ActionHandler>
  previewFallbackSchema?: PageNode
  /** Sandbox results used by the embedded preview; source code is never evaluated by the builder itself. */
  previewExpressionValues?: RuntimeExpressionValues
  /** Code-driven mode keeps the inspector structural and makes Page Code authoritative. */
  authoringMode?: PageBuilderAuthoringMode
  /** @deprecated The Builder now owns its preview runtime. */
  previewPageCodeValues?: PageCodeRuntimeValues
  /** @deprecated Used only as a fallback for actions unknown to the Builder runtime. */
  previewOnAction?: (id: string, values: ActionValues) => void | Promise<unknown>
  /** Application-owned capability host reused by the Builder's isolated preview session. */
  previewRuntimeHost?: PageRuntimeHost
  previewRuntimePageId?: string
  previewRuntimeTenantId?: string
  /** Host capability declarations merged into Monaco IntelliSense. */
  pageCodeExtraLibs?: CoarScriptEditorExtraLib[]
  /** Optional host-owned persistence boundary for reusable, versioned subtrees. */
  compositionRepository?: PageCompositionRepository
  /** `consume` keeps definition creation/publication in a separate host-owned editor. */
  compositionManagement?: PageCompositionManagement
}>();

/**
 * The working tree lives in the builder; v-model is synced two-way below.
 * Handing the model ref straight to usePageBuilder would freeze that decision
 * at setup — a host binding an initially-undefined ref (the async-loaded-schema
 * pattern) would leave the builder permanently detached from it. The two
 * watchers keep both sides live: builder edits flow out, host-assigned trees
 * flow in through the same normalize pass as JSON paste.
 */
function normalizedFromModel(value: PageNode): PageNode {
  const { schema, issues } = normalizePageSchema(value, { elements: mergedElements.value });
  if (issues.length > 0) {
    warnDev(
      `v-model schema needed repairs: ${issues.map((i) => `${i.path}: ${i.message}`).join(' · ')}`,
    );
  }
  return schema;
}

const configRef = computed(() => props.config);
const mergedElements = useMergedElements(configRef);

const builder = usePageBuilder({
  initial: model.value != null
    ? normalizedFromModel(toRaw(model.value))
    : {
        id: 'root',
        type: 'page',
        schemaVersion: CURRENT_PAGE_SCHEMA_VERSION,
        style: { gap: '16px', padding: '24px' },
        children: [],
      },
  elements: mergedElements,
  config: configRef,
});
const compositions = usePageCompositions({
  builder,
  repository: computed(() => props.compositionRepository),
  management: computed(() => props.compositionManagement ?? 'inline'),
  open: (reference) => emit('open-composition', reference),
});

// toRaw on both sides: a host that stores the schema in a deep ref hands the
// SAME tree back wrapped in a reactive proxy — without unwrapping, the echo of
// every builder edit would look like an external replacement (spurious history
// entry + selection reset).
watch(builder.schema, (s) => {
  if (toRaw(model.value) !== s) model.value = s;
}, { immediate: true });

watch(model, (next) => {
  if (next == null) return;
  const raw = toRaw(next);
  if (raw === toRaw(builder.schema.value)) return;
  builder.replaceSchema(normalizedFromModel(raw as PageNode));
});

const findings = useAuthoringFindings(builder.schema, configRef);

// Every schema mutation produces a fresh array, so identity alone would emit on
// each keystroke. Hosts get the list only when its CONTENT moves.
watch(findings.findings, (next, previous) => {
  if (previous && sameFindings(next, previous)) return;
  emit('findings', next.map((finding) => ({ ...finding })));
}, { immediate: true });

function sameFindings(a: readonly AuthoringFinding[], b: readonly AuthoringFinding[]) {
  return a.length === b.length && a.every((finding, i) =>
    finding.nodeId === b[i].nodeId
    && finding.field === b[i].field
    && finding.severity === b[i].severity
    && finding.message === b[i].message);
}

// Provided here (not in BuilderCanvas) so the outline pane — a sibling of the
// canvas — shares the same drag context: outline rows and canvas zones are
// drop targets of one and the same drag.
provideBuilderDnd(builder, {
  insertComposition: async (id, version, path, index) => {
    await compositions.insertAt(id, version, path, index);
  },
});

provide(BUILDER_API, builder);
provide(BUILDER_CONFIG, configRef);
provide(BUILDER_FINDINGS, findings);
provide(BUILDER_AUTHORING_MODE, computed(() => props.authoringMode ?? 'properties'));
provide(BUILDER_PAGE_CODE_LIBS, computed(() => props.pageCodeExtraLibs ?? []));
provide(BUILDER_COMPOSITIONS, compositions);

const authoringBreakpoint = ref<PageBreakpoint>('desktop');
provide(BUILDER_BREAKPOINT, authoringBreakpoint);

// ── Tab ───────────────────────────────────────────────────────────────────────
const activeTab = ref<string>('editor');
const activeLogicBinding = ref<{ nodeId: string; target: string } | null>(null);
const focusedTranslationKey = ref<string>();
const dialog = useDialog();

function findNodeById(root: PageNode, nodeId: string): { node: PageNode; path: NodePath } | null {
  if (root.id === nodeId) return { node: root, path: [] };
  if (!('children' in root) || !Array.isArray(root.children)) return null;
  for (let index = 0; index < root.children.length; index++) {
    const found = findNodeById(root.children[index], nodeId);
    if (found) return { node: found.node, path: [index, ...found.path] };
  }
  return null;
}

provide(BUILDER_LOGIC, {
  activeBinding: activeLogicBinding,
  openPageState() {
    activeTab.value = 'logic';
  },
  openTranslations(key) {
    focusedTranslationKey.value = key;
    activeTab.value = 'translations';
  },
  async openPageCode() {
    const root = builder.schema.value.type === 'page' ? builder.schema.value as PageRootNode : undefined;
    if (!root) return false;
    const editor = dialog.open<string>(BuilderPageRootCodeDialog, {
      title: 'Page Code · Root',
      size: 'xl',
      closeOnBackdropClick: false,
    }, {
      schema: builder.schema.value,
      source: root.rootCode,
      stateCode: root.stateCode,
      config: props.config,
      hostLibs: props.pageCodeExtraLibs ?? [],
    });
    const result = await editor.result;
    if (typeof result !== 'string') return false;
    builder.patch([], { rootCode: result || undefined } as Partial<PageNode>);
    return true;
  },
  async openElementCode(nodeId) {
    const location = findNodeById(builder.schema.value, nodeId);
    if (!location || location.node.type === 'page') return false;
    const node = location.node as ElementNode;
    const root = builder.schema.value.type === 'page' ? builder.schema.value as PageRootNode : undefined;
    const editor = dialog.open<string>(BuilderElementCodeDialog, {
      title: `Element Code · ${node.name ?? node.id}`,
      size: 'xl',
      closeOnBackdropClick: false,
    }, {
      schema: builder.schema.value,
      node,
      source: node.elementCode,
      stateCode: root?.stateCode,
      config: props.config,
      hostLibs: props.pageCodeExtraLibs ?? [],
    });
    const result = await editor.result;
    if (typeof result !== 'string') return false;
    const latest = findNodeById(builder.schema.value, nodeId);
    if (!latest || latest.node.type === 'page') return false;
    builder.patch(latest.path, { elementCode: result || undefined } as Partial<PageNode>);
    return true;
  },
  async openBinding(nodeId, target, initialExpression = 'undefined') {
    activeLogicBinding.value = { nodeId, target };
    const location = findNodeById(builder.schema.value, nodeId);
    if (!location || location.node.type === 'page') return false;
    const node = location.node as ElementNode;
    const current = node.bindings?.[target];
    const expression = current && isExpressionBinding(current)
      ? current.expression
      : initialExpression;
    const editor = dialog.open<string>(BuilderExpressionDialog, {
      title: `Expression · ${target}`,
      size: 'l',
      closeOnBackdropClick: false,
    }, {
      nodeId,
      target,
      expression,
      config: props.config,
    });
    const result = await editor.result;
    if (typeof result !== 'string') return false;

    // Resolve again: the schema may have changed while the modal was open.
    const latest = findNodeById(builder.schema.value, nodeId);
    if (!latest || latest.node.type === 'page') return false;
    const latestNode = latest.node as ElementNode;
    const bindings = { ...(latestNode.bindings ?? {}) };
    const latestBinding = bindings[target];
    bindings[target] = latestBinding && isExpressionBinding(latestBinding)
      ? { ...latestBinding, expression: result }
      : { source: 'expression', enabled: true, expression: result };
    builder.patch(latest.path, { bindings } as Partial<PageNode>);
    return true;
  },
});

// ── Responsive preview ───────────────────────────────────────────────────────
/** A built-in breakpoint id, 'fluid', or a host-defined viewport id. */
type PreviewWidth = PageBreakpoint | 'fluid' | (string & {});
const previewWidth = ref<PreviewWidth>('desktop');
const customPreviewViewport = ref<{ width: number; height?: number }>();
const PREVIEW_HEIGHTS: Record<PageBreakpoint, number> = { compact: 568, phone: 844, tablet: 1024, desktop: 800 };

/**
 * Viewport ids are open now that a host can add its own, so the built-in tables
 * are looked up defensively rather than indexed as if every id were a breakpoint.
 */
function builtInViewportWidth(id: string): number | undefined {
  return (PAGE_BREAKPOINT_WIDTHS as Record<string, number>)[id];
}
function builtInViewportHeight(id: string): number {
  return (PREVIEW_HEIGHTS as Record<string, number>)[id] ?? 800;
}
const previewLocaleOverride = ref('');
// Preview inputs belong to the host. Without the ones its own config declares,
// the sandbox has nothing truthful to run against, so the preview stays off.
const hasEffectivePreviewContract = computed(() =>
  (!(props.config?.contextFields?.length) || props.previewContext !== undefined)
  && (!(props.config?.locales?.length) || props.previewLocale !== undefined),
);

const previewFrameStyle = computed(() => {
  if (customPreviewViewport.value) return {
    width: `${customPreviewViewport.value.width}px`,
    height: `${customPreviewViewport.value.height ?? 800}px`,
    margin: '0 auto',
  };
  if (previewWidth.value === 'fluid') return { width: '100%', minHeight: '480px', margin: '0 auto' };
  const w = builtInViewportWidth(previewWidth.value) ?? PAGE_BREAKPOINT_WIDTHS.desktop;
  return { width: `${w}px`, height: `${builtInViewportHeight(previewWidth.value)}px`, margin: '0 auto' };
});

/*
 * The frame already carries the simulated viewport width, so unlike the canvas
 * its content must not be pinned — only scaled. Overlays are safe here because
 * CoarOverlayOutlet teleports to <body>, outside the transformed subtree that
 * would otherwise become their containing block.
 */
const previewViewportRef = ref<HTMLElement | null>(null);
const previewFrameRef = ref<HTMLElement | null>(null);
const {
  zoom: previewZoom,
  step: previewZoomStep,
  setZoom: previewZoomSet,
  reset: previewZoomReset,
  contentStyle: previewScaleContentStyle,
  frameStyle: previewScaleFrameStyle,
} = useCanvasZoom(previewViewportRef, previewFrameRef, {
  // A fluid frame is `width: 100%` and therefore has no width to measure;
  // pinning it to the pane is what stops the scale wrapper from collapsing it.
  pinToViewportWidth: computed(() => previewWidth.value === 'fluid'),
});

const previewViewportWidth = computed(() =>
  customPreviewViewport.value?.width
    ?? (previewWidth.value === 'fluid' ? undefined : builtInViewportWidth(previewWidth.value)),
);
const effectivePreviewContext = computed(() => props.previewContext);
const effectivePreviewLocale = computed(() => previewLocaleOverride.value || props.previewLocale);
const effectiveAuthoringLocale = computed(() => effectivePreviewLocale.value
  || props.config?.defaultLocale
  || props.config?.locales?.[0]?.id
  || 'en');
provide(BUILDER_LOCALE, {
  active: effectiveAuthoringLocale,
  setActive(locale) {
    previewLocaleOverride.value = locale;
  },
});
const previewRuntimeViewport = computed(() => {
  const width = previewViewportWidth.value ?? PAGE_BREAKPOINT_WIDTHS.desktop;
  return { width, breakpoint: breakpointForWidth(width) };
});
const previewRuntime = usePageCodeRuntime({
  pageId: computed(() => props.previewRuntimePageId ?? `page-builder-preview:${builder.schema.value.id}`),
  tenantId: props.previewRuntimeTenantId,
  schema: builder.schema,
  context: computed(() => effectivePreviewContext.value ?? {}),
  viewport: previewRuntimeViewport,
  locale: effectivePreviewLocale,
  enabled: hasEffectivePreviewContract,
  runtimeHost: props.previewRuntimeHost,
});
const effectivePreviewPageCodeValues = computed(() => hasEffectivePreviewContract.value
  ? previewRuntime.pageCodeValues.value
  : undefined);
provide(BUILDER_PAGE_CODE_VALUES, effectivePreviewPageCodeValues);
const builderRuntime = computed(() => ({
  config: props.config,
  context: effectivePreviewContext.value,
  pageState: effectivePreviewPageCodeValues.value?.state,
  locale: effectivePreviewLocale.value,
  translations: builder.schema.value.type === 'page'
    ? (builder.schema.value as PageRootNode).translations
    : undefined,
  hostTranslation: (locale: string, key: string) => localization?.i18nStore.getTranslation(locale, key),
}));
provide(BUILDER_RUNTIME, builderRuntime);

async function runPreviewAction(id: string, values: ActionValues) {
  if (await previewRuntime.runPageAction(id, values)) return;
  await props.previewOnAction?.(id, values);
}

function onPreviewRuntimeChange(scope: {
  fields: ActionValues;
  form: { valid: boolean; dirty: boolean; validating: boolean; submitting: boolean };
}) {
  previewRuntime.onRuntimeChange(scope);
  emit('preview-runtime', scope);
}

/**
 * The size list the toolbars offer. A host may replace it; the entries are
 * authoring-only, so widths still map onto the fixed breakpoints below.
 */
const previewViewportOptions = computed(() => props.config?.previewViewports ?? null);

function viewportOption(id: string) {
  return previewViewportOptions.value?.find((v) => v.id === id);
}

/** Device width the editor canvas is constrained to; null for the fluid case. */
const canvasViewportWidth = computed(() => {
  const custom = viewportOption(previewWidth.value);
  if (custom) return custom.width ?? null;
  return previewWidth.value === 'fluid' ? null : builtInViewportWidth(previewWidth.value) ?? null;
});

function setPreviewWidth(value: string) {
  customPreviewViewport.value = undefined;
  const custom = viewportOption(value);
  if (custom) {
    previewWidth.value = value as PreviewWidth;
    // A host size carries no breakpoint name: derive it from the width so the
    // cascade keeps working without host-defined breakpoints.
    if (custom.width) {
      customPreviewViewport.value = { width: custom.width, height: custom.height };
      authoringBreakpoint.value = breakpointForWidth(custom.width);
    }
    return;
  }
  previewWidth.value = value as PreviewWidth;
  if (value !== 'fluid') authoringBreakpoint.value = value as PageBreakpoint;
}

// ── Canvas-first tool drawers + inspector ─────────────────────────────────────
const DRAWER_DEFAULT = 300;
const DRAWER_MIN = 240;
const INSPECTOR_DEFAULT = 300;
const INSPECTOR_MIN = 260;
const MIDDLE_MIN = 360;
const TOOL_RAIL_WIDTH = 44;

type LeftToolPanel = 'outline' | 'library';
const leftToolPanel = ref<LeftToolPanel | null>(null);
const drawerWidth = ref(DRAWER_DEFAULT);
const inspectorWidth = ref(INSPECTOR_DEFAULT);
const inspectorCollapsed = ref(false);
const resizing = ref<null | 'drawer' | 'inspector'>(null);

const leftToolsCol = computed(() => `${TOOL_RAIL_WIDTH + (leftToolPanel.value ? drawerWidth.value : 0)}px`);
const inspectorCol = computed(() => inspectorCollapsed.value ? `${TOOL_RAIL_WIDTH}px` : `${inspectorWidth.value}px`);

function toggleLeftToolPanel(panel: LeftToolPanel) {
  leftToolPanel.value = leftToolPanel.value === panel ? null : panel;
}

// ── Splitter drag ─────────────────────────────────────────────────────────────
const rootRef = ref<HTMLElement | null>(null);

// ── Keyboard shortcuts (scoped to the builder) ────────────────────────────────

function isEditableTarget(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

/**
 * The listener is window-level (shortcuts must work right after a canvas
 * interaction), but strictly CONTAINED: it only acts while focus is inside
 * this builder instance, and never inside editable targets — those keep their
 * native text undo/delete (incl. the JSON tab's textarea and host-app inputs).
 */
function onKeyDown(e: KeyboardEvent) {
  if (!rootRef.value?.contains(document.activeElement)) return;
  if (isEditableTarget(e.target)) return;
  const meta = e.ctrlKey || e.metaKey;
  if (meta && (e.key === 'z' || e.key === 'Z')) {
    e.preventDefault();
    if (e.shiftKey) builder.redo(); else builder.undo();
    return;
  }
  if (meta && (e.key === 'y' || e.key === 'Y')) { e.preventDefault(); builder.redo(); return; }
  if (e.key !== 'Delete' && e.key !== 'Backspace') return;
  const sel = builder.selectedPath.value;
  if (!sel || sel.length === 0) return;
  e.preventDefault();
  builder.remove(sel);
  // Deleting the FOCUSED node drops focus to <body>, which would disarm the
  // very next Ctrl+Z — re-anchor on the builder root once the DOM settled.
  void nextTick(() => {
    if (rootRef.value && !rootRef.value.contains(document.activeElement)) {
      rootRef.value.focus({ preventScroll: true });
    }
  });
}

/**
 * Presses on non-focusable builder chrome would drop focus to <body> and
 * silently disarm the shortcuts — anchor it on the root instead. Focusable
 * targets (inputs, rows, canvas nodes) win afterwards via the browser's own
 * mousedown focus behavior.
 */
function onRootPointerDown() {
  if (!rootRef.value) return;
  if (!rootRef.value.contains(document.activeElement)) {
    rootRef.value.focus({ preventScroll: true });
  }
}

onMounted(() => window.addEventListener('keydown', onKeyDown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeyDown));

function startResize(target: 'drawer' | 'inspector', event: PointerEvent) {
  if ((target === 'drawer' && !leftToolPanel.value) || (target === 'inspector' && inspectorCollapsed.value)) return;
  event.preventDefault();
  resizing.value = target;
  const startX = event.clientX;
  const startDrawer = drawerWidth.value;
  const startInspector = inspectorWidth.value;

  function onMove(ev: PointerEvent) {
    const w = rootRef.value?.getBoundingClientRect().width ?? 0;
    if (!w) return;
    const drawerTotal = TOOL_RAIL_WIDTH + (leftToolPanel.value ? drawerWidth.value : 0);
    const inspectorTotal = inspectorCollapsed.value ? TOOL_RAIL_WIDTH : inspectorWidth.value;
    const delta = ev.clientX - startX;
    if (target === 'drawer') {
      const available = w - TOOL_RAIL_WIDTH - inspectorTotal - MIDDLE_MIN - 2;
      drawerWidth.value = Math.min(Math.max(startDrawer + delta, DRAWER_MIN), Math.max(DRAWER_MIN, available));
    } else {
      const available = w - drawerTotal - MIDDLE_MIN - 2;
      inspectorWidth.value = Math.min(Math.max(startInspector - delta, INSPECTOR_MIN), Math.max(INSPECTOR_MIN, available));
    }
  }
  function onUp() {
    resizing.value = null;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
  }
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
}

// ── JSON tab ──────────────────────────────────────────────────────────────────
const jsonText = ref(JSON.stringify(builder.schema.value, null, 2));
const jsonError = ref('');
const jsonWarning = ref('');
let userEditing = false;

watch(builder.schema, (s) => {
  if (!userEditing) jsonText.value = JSON.stringify(s, null, 2);
}, { deep: false });

function onJsonInput(e: Event) {
  userEditing = true;
  jsonWarning.value = '';
  jsonText.value = (e.target as HTMLTextAreaElement).value;
  try { JSON.parse(jsonText.value); jsonError.value = ''; }
  catch { jsonError.value = 'Invalid JSON'; }
}
function onJsonBlur() { userEditing = false; }

function issueSummary(list: NormalizeIssue[]): string {
  const first = `${list[0].path}: ${list[0].message}`;
  return list.length === 1 ? first : `${first} (+${list.length - 1} more)`;
}

function applyJson() {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText.value);
  } catch (e: unknown) {
    jsonError.value = e instanceof Error ? e.message : 'Invalid JSON';
    return;
  }
  // Structural gate: nothing BROKEN may reach the working tree (and through
  // v-model the host's storage) — a committed-then-crashing schema would come
  // back on every reload. Warnings (healed or lossless findings, e.g. unknown
  // element types) apply anyway: a document from a newer library version or
  // with unregistered consumer elements must stay editable here.
  const { schema, issues } = normalizePageSchema(parsed, { elements: mergedElements.value });
  const errors = issues.filter((i) => i.severity === 'error');
  if (errors.length > 0) {
    jsonError.value = issueSummary(errors);
    return;
  }
  builder.replaceSchema(schema);
  jsonError.value = '';
  jsonWarning.value = issues.length > 0 ? issueSummary(issues) : '';
  if (issues.length === 0) activeTab.value = 'editor';
}
</script>

<template>
  <div
    ref="rootRef"
    class="pb-builder"
    :class="{
      'pb-builder--resizing': resizing !== null,
    }"
    tabindex="-1"
    :style="{ gridTemplateColumns: `${leftToolsCol} 1px minmax(360px, 1fr) 1px ${inspectorCol}` }"
    @pointerdown="onRootPointerDown"
  >
    <!-- ── Quiet activity rail + one contextual drawer ── -->
    <section class="pb-builder__pane pb-builder__pane--tools">
      <nav class="pb-builder__activity-rail" :aria-label="t('coar.pageBuilder.chrome.builderTools', undefined, 'Builder tools')">
        <button
          type="button"
          class="pb-builder__activity-btn"
          :class="{ 'pb-builder__activity-btn--active': leftToolPanel === 'library' }"
          :aria-pressed="leftToolPanel === 'library'"
          :aria-label="t('coar.pageBuilder.chrome.insertElements', undefined, 'Insert elements')"
          :title="t('coar.pageBuilder.chrome.insertElements', undefined, 'Insert elements')"
          @click="toggleLeftToolPanel('library')"
        >
          <CoarIcon name="plus" size="s" />
        </button>
        <button
          type="button"
          class="pb-builder__activity-btn"
          :class="{ 'pb-builder__activity-btn--active': leftToolPanel === 'outline' }"
          :aria-pressed="leftToolPanel === 'outline'"
          :aria-label="t('coar.pageBuilder.chrome.outline', undefined, 'Structure')"
          :title="t('coar.pageBuilder.chrome.outline', undefined, 'Structure')"
          @click="toggleLeftToolPanel('outline')"
        >
          <CoarIcon name="list" size="s" />
        </button>
      </nav>

      <div v-if="leftToolPanel" class="pb-builder__tool-drawer">
        <template v-if="leftToolPanel === 'outline'">
          <header class="pb-builder__pane-header">
            <CoarIcon name="list" size="s" />
            <span class="pb-builder__pane-title">{{ t('coar.pageBuilder.chrome.outline', undefined, 'Structure') }}</span>
            <button type="button" class="pb-builder__icon-btn" :title="t('coar.pageBuilder.chrome.closeOutline', undefined, 'Close structure')" @click="leftToolPanel = null">
              <CoarIcon name="chevrons-left" size="s" />
            </button>
          </header>
          <div class="pb-builder__tree-scroll">
            <BuilderOutline />
          </div>
        </template>
        <template v-else>
          <header class="pb-builder__pane-header">
            <CoarIcon name="plus" size="s" />
            <span class="pb-builder__pane-title">{{ t('coar.pageBuilder.chrome.insert', undefined, 'Insert') }}</span>
            <button type="button" class="pb-builder__icon-btn" :title="t('coar.pageBuilder.chrome.closeLibrary', undefined, 'Close element library')" @click="leftToolPanel = null">
              <CoarIcon name="chevrons-left" size="s" />
            </button>
          </header>
          <BuilderPalette />
        </template>
      </div>
    </section>

    <!-- ── Tool drawer divider ── -->
    <div
      class="pb-builder__divider"
      :class="{ 'pb-builder__divider--inert': !leftToolPanel }"
      role="separator"
      @pointerdown="startResize('drawer', $event)"
    />

    <!-- ── Center pane ── -->
    <section class="pb-builder__pane pb-builder__pane--center">
      <CoarTabGroup v-model="activeTab" class="pb-builder__tabs">
        <template #actions>
          <button type="button" class="pb-builder__icon-btn" :disabled="!builder.canUndo.value" :title="t('coar.pageBuilder.chrome.undo', undefined, 'Undo (Ctrl+Z)')" @click="builder.undo()">
            <CoarIcon name="undo-2" size="s" />
          </button>
          <button type="button" class="pb-builder__icon-btn" :disabled="!builder.canRedo.value" :title="t('coar.pageBuilder.chrome.redo', undefined, 'Redo (Ctrl+Y)')" @click="builder.redo()">
            <CoarIcon name="redo-2" size="s" />
          </button>
        </template>

        <CoarTab id="editor">
          <template #default>
            <span class="pb-builder__tab-label">
              <CoarIcon name="pencil" size="s" />
              {{ t('coar.pageBuilder.chrome.tabEditor', undefined, 'Editor') }}
            </span>
          </template>
          <template #content>
            <BuilderCanvas :viewport-width="canvasViewportWidth">
              <template #toolbar>
                <!-- Same controls as the preview: canvas previews render from
                     the node alone and never see runtime data. -->
                <BuilderViewportControl :value="previewWidth" :viewports="config?.previewViewports" @select="setPreviewWidth" />
                <label v-if="config?.locales?.length" class="pb-builder__bar-control">
                  {{ t('coar.pageBuilder.chrome.language', undefined, 'Language') }}
                  <select v-model="previewLocaleOverride">
                    <option value="">Host</option>
                    <option v-for="item in config.locales" :key="item.id" :value="item.id">{{ item.label }}</option>
                  </select>
                </label>
              </template>
            </BuilderCanvas>
          </template>
        </CoarTab>

        <CoarTab id="preview">
          <template #default>
            <span class="pb-builder__tab-label">
              <CoarIcon name="eye" size="s" />
              {{ t('coar.pageBuilder.chrome.tabPreview', undefined, 'Preview') }}
            </span>
          </template>
          <template #content>
            <div class="pb-builder__preview-pane">
              <!-- Responsive width toggle -->
              <div class="pb-builder__preview-toolbar">
                <BuilderViewportControl :value="previewWidth" :viewports="config?.previewViewports" @select="setPreviewWidth" />
                <label v-if="config?.locales?.length" class="pb-builder__bar-control">
                  Language
                  <select v-model="previewLocaleOverride">
                    <option value="">Host</option>
                    <option v-for="item in config.locales" :key="item.id" :value="item.id">{{ item.label }}</option>
                  </select>
                </label>
                <BuilderZoomControl
                  :zoom="previewZoom"
                  :min="CANVAS_ZOOM_STEPS[0]"
                  :max="CANVAS_ZOOM_STEPS[CANVAS_ZOOM_STEPS.length - 1]"
                  @step="previewZoomStep"
                  @set="previewZoomSet"
                  @reset="previewZoomReset"
                />
              </div>
              <div ref="previewViewportRef" class="pb-builder__preview">
                <!-- Reserves the space the scaled frame occupies; a transform
                     changes no layout box on its own. -->
                <div class="pb-builder__preview-scale" :style="previewScaleFrameStyle">
                <div
                  ref="previewFrameRef"
                  class="pb-builder__preview-frame"
                  :style="{ ...previewFrameStyle, ...previewScaleContentStyle }"
                >
                  <!-- The renderer falls back to config.assetResolver itself. -->
                  <CoarThemeScope
                    v-if="hasEffectivePreviewContract"
                    :theme="previewTheme"
                    :mode="previewThemeMode ?? 'auto'"
                  >
                    <!-- The renderer falls back to config.assetResolver itself. -->
                    <CoarPageRenderer
                      :schema="builder.schema.value"
                      :config="config"
                      :viewport-width="previewViewportWidth"
                      :runtime-context="effectivePreviewContext"
                      :initial-values="previewInitialValues"
                      :locale="effectivePreviewLocale"
                      :actions="previewActions"
                      :fallback-schema="previewFallbackSchema"
                      :expression-values="previewExpressionValues"
                      :page-code-values="effectivePreviewPageCodeValues"
                      :on-action="runPreviewAction"
                      @update:values="emit('preview-values', $event)"
                      @runtime-change="onPreviewRuntimeChange"
                    />
                  </CoarThemeScope>
                  <div v-else class="pb-builder__preview-empty">
                    <CoarIcon name="circle-alert" size="m" />
                    <strong>Preview values are missing</strong>
                    <span>The host must supply the preview context and locale its config declares.</span>
                  </div>
                </div>
                </div>
              </div>
            </div>
          </template>
        </CoarTab>

        <CoarTab id="logic">
          <template #default>
            <span class="pb-builder__tab-label">
              <CoarIcon name="code" size="s" />
              Logic
            </span>
          </template>
          <template #content>
            <BuilderLogicPanel v-if="activeTab === 'logic'" />
          </template>
        </CoarTab>

        <CoarTab id="translations">
          <template #default>
            <span class="pb-builder__tab-label">
              <CoarIcon name="globe" size="s" />
              Translations
            </span>
          </template>
          <template #content>
            <BuilderTranslationsPanel
              v-if="activeTab === 'translations'"
              :focus-key="focusedTranslationKey"
            />
          </template>
        </CoarTab>

        <CoarTab v-if="compositionRepository" id="compositions">
          <template #default>
            <span class="pb-builder__tab-label">
              <CoarIcon name="copy" size="s" />
              Compositions
            </span>
          </template>
          <template #content>
            <BuilderCompositionsPanel v-if="activeTab === 'compositions'" />
          </template>
        </CoarTab>

        <CoarTab id="json">
          <template #default>
            <span class="pb-builder__tab-label">
              <CoarIcon name="code" size="s" />
              {{ t('coar.pageBuilder.chrome.tabJson', undefined, 'JSON') }}
            </span>
          </template>
          <template #content>
            <div class="pb-builder__json-pane">
              <div class="pb-builder__json-toolbar">
                <span class="pb-builder__json-hint">{{ t('coar.pageBuilder.chrome.jsonHint', undefined, 'Paste or edit JSON, then click Apply') }}</span>
                <span v-if="jsonError" class="pb-builder__json-error">{{ jsonError }}</span>
                <span v-else-if="jsonWarning" class="pb-builder__json-warning">{{ jsonWarning }}</span>
                <button class="pb-builder__json-apply" :disabled="!!jsonError" @click="applyJson">
                  {{ t('coar.pageBuilder.chrome.jsonApply', undefined, 'Apply →') }}
                </button>
              </div>
              <textarea
                class="pb-builder__json-editor"
                :value="jsonText"
                spellcheck="false"
                @input="onJsonInput"
                @blur="onJsonBlur"
              />
            </div>
          </template>
        </CoarTab>
      </CoarTabGroup>
    </section>

    <!-- ── Inspector divider ── -->
    <div
      class="pb-builder__divider"
      :class="{ 'pb-builder__divider--inert': inspectorCollapsed }"
      role="separator"
      @pointerdown="startResize('inspector', $event)"
    />

    <!-- ── Dedicated properties inspector ── -->
    <section class="pb-builder__pane pb-builder__pane--inspector" :class="{ 'pb-builder__pane--rail': inspectorCollapsed }">
      <template v-if="!inspectorCollapsed">
        <button type="button" class="pb-builder__icon-btn pb-builder__icon-btn--corner" :title="t('coar.pageBuilder.chrome.collapseInspector', undefined, 'Collapse properties')" @click="inspectorCollapsed = true">
          <CoarIcon name="chevrons-right" size="s" />
        </button>
        <BuilderPropsPanel class="pb-builder__pane-inner" />
      </template>
      <button v-else type="button" class="pb-builder__rail-btn" :title="t('coar.pageBuilder.chrome.expandInspector', undefined, 'Expand properties')" @click="inspectorCollapsed = false">
        <CoarIcon name="panel-right" size="s" />
      </button>
    </section>
  </div>
</template>

<style scoped>
.pb-builder {
  display: grid;
  height: 100%;
  min-height: 520px;
  background: var(--coar-background-neutral-primary, #fff);
  border: 1px solid var(--coar-border-neutral, #e2e2e6);
  border-radius: 8px;
  overflow: hidden;
  font-family: var(--coar-body-base-family, sans-serif);
  font-size: 13px;
  font-weight: 400;
  color: var(--coar-text-neutral-primary, #202124);
  transition: grid-template-columns 0.18s ease-out;
}

.pb-builder--resizing {
  transition: none;
  user-select: none;
  cursor: col-resize;
}

/* The root is a programmatic focus anchor (shortcut scope), never a visible stop. */
.pb-builder:focus {
  outline: none;
}

/* ── Panes ── */
.pb-builder__pane {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  background: var(--coar-background-neutral-primary, #fff);
  position: relative;
}

.pb-builder__pane--rail {
  align-items: center;
  justify-content: flex-start;
  padding: 8px 0;
}

.pb-builder__pane--tools {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  background: var(--coar-background-neutral-secondary, #f8f8f9);
}

.pb-builder__activity-rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 0;
  border-right: 1px solid var(--coar-border-neutral-tertiary, #ececef);
}

.pb-builder__activity-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--coar-icon-neutral-secondary, #6c7078);
  cursor: pointer;
  transition: background-color 0.12s ease-out, color 0.12s ease-out;
}

.pb-builder__activity-btn:hover {
  background: var(--coar-background-neutral-tertiary, #eeeef1);
  color: var(--coar-icon-neutral-primary, #202124);
}

.pb-builder__activity-btn--active {
  background: var(--coar-surface-accent-secondary, #eef3f9);
  color: var(--coar-text-accent-primary, #315f91);
}

.pb-builder__activity-btn--active::before {
  content: '';
  position: absolute;
  left: -6px;
  width: 2px;
  height: 18px;
  border-radius: 2px;
  background: var(--coar-background-accent-primary, #315f91);
}

.pb-builder__tool-drawer {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
  background: var(--coar-background-neutral-primary, #fff);
}

/* ── Panel header (outline pane) ── */
.pb-builder__pane-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  height: 40px;
  box-sizing: border-box;
  border-bottom: 1px solid var(--coar-border-neutral, #e2e2e6);
  color: var(--coar-text-neutral-secondary, #5a5a60);
  flex-shrink: 0;
}

.pb-builder__pane-title {
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.01em;
  color: var(--coar-text-neutral-secondary, #5a5a60);
  flex: 1;
}

/* Align the tab list and props header to the same compact height. */
.pb-builder :deep(.coar-tab-list) {
  min-height: 40px;
  box-sizing: border-box;
  align-items: stretch;
}
.pb-builder :deep(.coar-tab-button) {
  padding-top: 0;
  padding-bottom: 0;
  display: inline-flex;
  align-items: center;
  font-weight: 400;
  font-size: 13px;
}
/* The accent underline is the only selection signal here: colouring the label
   as well made the tab strip the loudest thing in an otherwise quiet chrome. */
.pb-builder :deep(.coar-tab-button:hover:not(.disabled)),
.pb-builder :deep(.coar-tab-button.active) {
  color: var(--coar-text-neutral-primary, #202124);
}
.pb-builder :deep(.pb-props__header) {
  height: 40px;
  padding: 0 12px;
  box-sizing: border-box;
}

/* Make the tab content area fill remaining pane height */
.pb-builder :deep(.coar-tab-content) {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}
.pb-builder :deep(.coar-tab-panel) {
  display: none;
}
.pb-builder :deep(.coar-tab-panel.active) {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* The outline owns its own scrolling; this is only the frame around it. */
.pb-builder__tree-scroll {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 6px 4px 12px;
}

.pb-builder__pane-inner {
  flex: 1;
  min-height: 0;
  border: none;
  border-radius: 0;
}

/* ── Dividers ── */
.pb-builder__divider {
  background: var(--coar-border-neutral, #e2e2e6);
  cursor: col-resize;
  position: relative;
  z-index: 1;
  transition: background-color 0.12s ease-out;
}
/* The visible seam stays 1px; the grab area is widened so the handle is still
   hittable with a finger on the tablet form factor this ships for. */
.pb-builder__divider::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: -5px;
  right: -5px;
  cursor: inherit;
}
.pb-builder__divider:hover,
.pb-builder--resizing .pb-builder__divider {
  background: var(--coar-background-accent-primary, #1666cc);
}
.pb-builder__divider--inert {
  cursor: default;
  pointer-events: none;
}
.pb-builder__divider--inert::after { pointer-events: none; }

/* ── Icon buttons ── */
.pb-builder__icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 1px solid transparent;
  background: transparent;
  color: var(--coar-icon-neutral-secondary, #5a5a60);
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.12s, color 0.12s, border-color 0.12s;
}
.pb-builder__icon-btn:hover:not(:disabled) {
  background: var(--coar-background-neutral-secondary, #f0f0f2);
  border-color: var(--coar-border-neutral, #dcdce0);
  color: var(--coar-icon-neutral-primary, #111);
}
.pb-builder__icon-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.pb-builder__icon-btn--corner {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
}

.pb-builder__rail-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid transparent;
  background: transparent;
  color: var(--coar-icon-neutral-secondary, #5a5a60);
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.12s, border-color 0.12s, color 0.12s;
}
.pb-builder__rail-btn:hover {
  background: var(--coar-background-neutral-secondary, #f0f0f2);
  border-color: var(--coar-border-neutral, #dcdce0);
  color: var(--coar-icon-neutral-primary, #111);
}

/* ── Center pane ── */
.pb-builder__pane--center { padding: 0; }

.pb-builder__tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.pb-builder__tab-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.pb-builder__preview-pane {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.pb-builder__preview-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  height: 38px;
  box-sizing: border-box;
  border-bottom: 1px solid var(--coar-border-neutral, #e2e2e6);
  background: var(--coar-background-neutral-secondary, #f7f7f9);
  flex-shrink: 0;
}

.pb-builder__bar-control { display: inline-flex; align-items: center; gap: 5px; margin-left: 4px; color: var(--coar-text-neutral-secondary, #555); font-size: 11px; }

/*
 * Centres the scaled frame while it is narrower than the pane. Deliberately no
 * `width: fit-content`: the fluid frame is `width: 100%`, and a percentage
 * against a shrink-to-fit parent collapses it to a few pixels. While zoomed the
 * width comes from the zoom composable, which is what auto margins act on.
 */
.pb-builder__preview-scale { margin-inline: auto; }
.pb-builder__bar-control select { max-width: 150px; border: 1px solid var(--coar-border-neutral, #d0d0d0); border-radius: 4px; background: var(--coar-background-neutral-primary, #fff); font: inherit; }

.pb-builder__preview {
  padding: 20px 24px;
  overflow: auto;
  flex: 1;
  min-height: 0;
  box-sizing: border-box;
  background: var(--coar-background-neutral-secondary, #f7f8f9);
}

.pb-builder__preview-frame {
  background: var(--coar-background-neutral-primary, #fff);
  border: 1px solid var(--coar-border-neutral, #e2e2e6);
  border-radius: 8px;
  overflow: auto;
  flex: 0 0 auto;
  transition: max-width 0.18s ease-out, width 0.18s ease-out;
}

.pb-builder__preview-empty {
  display: flex;
  min-height: 240px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
  padding: 24px;
  box-sizing: border-box;
  color: var(--coar-text-neutral-secondary, #666);
  text-align: center;
}

.pb-builder__preview-empty strong { color: var(--coar-text-neutral-primary, #222); }
.pb-builder__preview-empty span { max-width: 440px; font-size: 12px; }

/* ── JSON pane ── */
.pb-builder__json-pane {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.pb-builder__json-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-bottom: 1px solid var(--coar-border-neutral, #e2e2e6);
  background: var(--coar-background-neutral-secondary, #f7f7f9);
  flex-shrink: 0;
}

.pb-builder__json-hint {
  font-size: 12px;
  color: var(--coar-text-neutral-secondary, #888);
  flex: 1;
}

.pb-builder__json-error {
  font-size: 12px;
  color: var(--coar-text-semantic-error-bold, #c0392b);
  font-family: ui-monospace, Menlo, Consolas, monospace;
}

.pb-builder__json-warning {
  font-size: 12px;
  color: var(--coar-text-semantic-warning-bold, #9a6700);
  font-family: ui-monospace, Menlo, Consolas, monospace;
}

.pb-builder__json-apply {
  padding: 4px 14px;
  border-radius: 4px;
  border: none;
  background: var(--coar-background-accent-primary, #1666cc);
  color: #fff;
  font-size: 12px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
}
.pb-builder__json-apply:disabled { opacity: 0.4; cursor: default; }
.pb-builder__json-apply:not(:disabled):hover { filter: brightness(0.92); }

.pb-builder__json-editor {
  flex: 1;
  resize: none;
  border: none;
  outline: none;
  padding: 16px;
  font-family: ui-monospace, Menlo, Consolas, monospace;
  font-size: 12px;
  color: var(--coar-text-neutral-primary, #111);
  background: var(--coar-background-neutral-secondary, #f7f7f9);
  line-height: 1.55;
}
</style>
