<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, provide, ref, toRaw, watch } from 'vue';
import { CoarIcon, CoarTabGroup, CoarTab } from '@cocoar/vue-ui';
import { useI18n } from '@cocoar/vue-localization';
import type { PageNode, PageConfig } from './schema';
import { usePageBuilder } from './builder/usePageBuilder';
import { useSchemaValidation } from './builder/useSchemaValidation';
import { provideBuilderDnd } from './builder/useBuilderDnd';
import { normalizePageSchema, type NormalizeIssue } from './builder/schemaNormalize';
import { warnDev } from './builder/operations';
import {
  BUILDER_API,
  BUILDER_CONFIG,
  BUILDER_VALIDATION,
} from './builder/builderContext';
import BuilderOutline from './builder/BuilderOutline.vue';
import BuilderCanvas from './builder/BuilderCanvas.vue';
import BuilderPropsPanel from './builder/BuilderPropsPanel.vue';
import CoarPageRenderer from './CoarPageRenderer.vue';

const { t } = useI18n();

const model = defineModel<PageNode>({ required: false });

const props = defineProps<{
  /**
   * Security/allowlist config. The SAME config must also be passed to
   * `<CoarPageRenderer>` so disallowed elements are filtered both during
   * authoring (palette + add-child menu) and at render time (security boundary).
   */
  config?: PageConfig
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
  const { schema, issues } = normalizePageSchema(value);
  if (issues.length > 0) {
    warnDev(
      `v-model schema needed repairs: ${issues.map((i) => `${i.path}: ${i.message}`).join(' · ')}`,
    );
  }
  return schema;
}

const builder = usePageBuilder({
  initial: model.value != null
    ? normalizedFromModel(toRaw(model.value))
    : {
        id: 'root',
        type: 'page',
        schemaVersion: 1,
        style: { gap: '16px', padding: '24px' },
        children: [],
      },
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

const configRef = computed(() => props.config);
const validation = useSchemaValidation(builder.schema, configRef);

// Provided here (not in BuilderCanvas) so the outline pane — a sibling of the
// canvas — shares the same drag context: outline rows and canvas zones are
// drop targets of one and the same drag.
provideBuilderDnd(builder);

provide(BUILDER_API, builder);
provide(BUILDER_CONFIG, configRef);
provide(BUILDER_VALIDATION, validation);

// ── Tab ───────────────────────────────────────────────────────────────────────
const activeTab = ref<string>('editor');

// ── Responsive preview ───────────────────────────────────────────────────────
type PreviewWidth = 'full' | 'tablet' | 'mobile';
const previewWidth = ref<PreviewWidth>('full');

const PREVIEW_WIDTHS: Record<Exclude<PreviewWidth, 'full'>, number> = {
  tablet: 768,
  mobile: 375,
};

const previewFrameStyle = computed(() => {
  if (previewWidth.value === 'full') return {};
  const w = PREVIEW_WIDTHS[previewWidth.value];
  return { maxWidth: `${w}px`, width: '100%', margin: '0 auto' };
});

// ── Panel widths + collapse ────────────────────────────────────────────────────
const OUTLINE_DEFAULT = 260;
const OUTLINE_MIN = 180;
const PROPS_DEFAULT = 280;
const PROPS_MIN = 220;
const MIDDLE_MIN = 360;
const RAIL_WIDTH = 36;

const outlineWidth = ref(OUTLINE_DEFAULT);
const propsWidth = ref(PROPS_DEFAULT);
const outlineCollapsed = ref(false);
const propsCollapsed = ref(false);
const resizing = ref<null | 'outline' | 'props'>(null);

const outlineCol = ref(`${OUTLINE_DEFAULT}px`);
const propsCol = ref(`${PROPS_DEFAULT}px`);

watch([outlineCollapsed, outlineWidth], () => {
  outlineCol.value = outlineCollapsed.value ? `${RAIL_WIDTH}px` : `${outlineWidth.value}px`;
});
watch([propsCollapsed, propsWidth], () => {
  propsCol.value = propsCollapsed.value ? `${RAIL_WIDTH}px` : `${propsWidth.value}px`;
});

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

function startResize(target: 'outline' | 'props', event: PointerEvent) {
  if ((target === 'outline' && outlineCollapsed.value) || (target === 'props' && propsCollapsed.value)) return;
  event.preventDefault();
  resizing.value = target;
  const startX = event.clientX;
  const startOutline = outlineWidth.value;
  const startProps = propsWidth.value;

  function onMove(ev: PointerEvent) {
    const w = rootRef.value?.getBoundingClientRect().width ?? 0;
    if (!w) return;
    const other = target === 'outline'
      ? (propsCollapsed.value ? RAIL_WIDTH : propsWidth.value)
      : (outlineCollapsed.value ? RAIL_WIDTH : outlineWidth.value);
    const available = w - other - MIDDLE_MIN - 2;
    const delta = ev.clientX - startX;
    if (target === 'outline') {
      outlineWidth.value = Math.min(Math.max(startOutline + delta, OUTLINE_MIN), Math.max(OUTLINE_MIN, available));
    } else {
      propsWidth.value = Math.min(Math.max(startProps - delta, PROPS_MIN), Math.max(PROPS_MIN, available));
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
  const { schema, issues } = normalizePageSchema(parsed);
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
      'pb-builder--outline-collapsed': outlineCollapsed,
      'pb-builder--props-collapsed': propsCollapsed,
      'pb-builder--resizing': resizing !== null,
    }"
    tabindex="-1"
    @pointerdown="onRootPointerDown"
  >
    <!-- ── Outline pane ── -->
    <section
      class="pb-builder__pane pb-builder__pane--tree"
      :class="{ 'pb-builder__pane--rail': outlineCollapsed }"
    >
      <template v-if="!outlineCollapsed">
        <header class="pb-builder__pane-header">
          <CoarIcon name="list" size="s" />
          <span class="pb-builder__pane-title">{{ t('coar.pageBuilder.chrome.outline', undefined, 'Outline') }}</span>
          <button type="button" class="pb-builder__icon-btn" :title="t('coar.pageBuilder.chrome.collapseOutline', undefined, 'Collapse outline')" @click="outlineCollapsed = true">
            <CoarIcon name="chevrons-left" size="s" />
          </button>
        </header>
        <div class="pb-builder__tree-scroll">
          <BuilderOutline />
        </div>
      </template>
      <button v-else type="button" class="pb-builder__rail-btn" :title="t('coar.pageBuilder.chrome.expandOutline', undefined, 'Expand outline')" @click="outlineCollapsed = false">
        <CoarIcon name="chevrons-right" size="s" />
      </button>
    </section>

    <!-- ── Left divider ── -->
    <div
      class="pb-builder__divider"
      :class="{ 'pb-builder__divider--inert': outlineCollapsed }"
      role="separator"
      @pointerdown="startResize('outline', $event)"
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
            <BuilderCanvas />
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
                <div class="pb-builder__seg" role="radiogroup" :aria-label="t('coar.pageBuilder.chrome.previewWidth', undefined, 'Preview width')">
                  <button
                    type="button"
                    class="pb-builder__seg-btn"
                    :class="{ 'pb-builder__seg-btn--active': previewWidth === 'full' }"
                    role="radio"
                    :aria-checked="previewWidth === 'full'"
                    :title="t('coar.pageBuilder.chrome.previewFullTitle', undefined, 'Full width')"
                    @click="previewWidth = 'full'"
                  >
                    {{ t('coar.pageBuilder.chrome.previewDesktop', undefined, 'Desktop') }}
                  </button>
                  <button
                    type="button"
                    class="pb-builder__seg-btn"
                    :class="{ 'pb-builder__seg-btn--active': previewWidth === 'tablet' }"
                    role="radio"
                    :aria-checked="previewWidth === 'tablet'"
                    :title="t('coar.pageBuilder.chrome.previewTabletTitle', undefined, '768px')"
                    @click="previewWidth = 'tablet'"
                  >
                    {{ t('coar.pageBuilder.chrome.previewTablet', undefined, 'Tablet · 768') }}
                  </button>
                  <button
                    type="button"
                    class="pb-builder__seg-btn"
                    :class="{ 'pb-builder__seg-btn--active': previewWidth === 'mobile' }"
                    role="radio"
                    :aria-checked="previewWidth === 'mobile'"
                    :title="t('coar.pageBuilder.chrome.previewMobileTitle', undefined, '375px')"
                    @click="previewWidth = 'mobile'"
                  >
                    {{ t('coar.pageBuilder.chrome.previewMobile', undefined, 'Mobile · 375') }}
                  </button>
                </div>
              </div>
              <div class="pb-builder__preview">
                <div class="pb-builder__preview-frame" :style="previewFrameStyle">
                  <!-- The renderer falls back to config.assetResolver itself. -->
                  <CoarPageRenderer
                    :schema="builder.schema.value"
                    :config="config"
                  />
                </div>
              </div>
            </div>
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

    <!-- ── Right divider ── -->
    <div
      class="pb-builder__divider"
      :class="{ 'pb-builder__divider--inert': propsCollapsed }"
      role="separator"
      @pointerdown="startResize('props', $event)"
    />

    <!-- ── Properties pane ── -->
    <section
      class="pb-builder__pane pb-builder__pane--props"
      :class="{ 'pb-builder__pane--rail': propsCollapsed }"
    >
      <template v-if="!propsCollapsed">
        <button type="button" class="pb-builder__icon-btn pb-builder__icon-btn--corner" :title="t('coar.pageBuilder.chrome.collapseProperties', undefined, 'Collapse properties')" @click="propsCollapsed = true">
          <CoarIcon name="chevrons-right" size="s" />
        </button>
        <BuilderPropsPanel class="pb-builder__pane-inner" />
      </template>
      <button v-else type="button" class="pb-builder__rail-btn" :title="t('coar.pageBuilder.chrome.expandProperties', undefined, 'Expand properties')" @click="propsCollapsed = false">
        <CoarIcon name="chevrons-left" size="s" />
      </button>
    </section>
  </div>
</template>

<style scoped>
.pb-builder {
  display: grid;
  grid-template-columns:
    v-bind(outlineCol) 1px minmax(360px, 1fr) 1px v-bind(propsCol);
  height: 100%;
  min-height: 520px;
  background: var(--coar-surface-default, #fff);
  border: 1px solid var(--coar-border-neutral, #e2e2e6);
  border-radius: 8px;
  overflow: hidden;
  font-family: var(--coar-body-base-family, sans-serif);
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
  background: var(--coar-surface-default, #fff);
  position: relative;
}

.pb-builder__pane--rail {
  align-items: center;
  justify-content: flex-start;
  padding: 8px 0;
}

/* ── Panel header (outline pane) ── */
.pb-builder__pane-header {
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

.pb-builder__pane-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--coar-text-neutral-secondary, #5a5a60);
  flex: 1;
}

/* Align the tab list, props header to the same 44px height */
.pb-builder :deep(.coar-tab-list) {
  min-height: 44px;
  box-sizing: border-box;
  align-items: stretch;
}
.pb-builder :deep(.coar-tab-button) {
  padding-top: 0;
  padding-bottom: 0;
  display: inline-flex;
  align-items: center;
}
.pb-builder :deep(.pb-props__header) {
  height: 44px;
  padding: 0 14px;
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

.pb-builder__tree-scroll {
  flex: 1;
  overflow: auto;
  padding: 6px 6px 12px;
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
.pb-builder__divider::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: -3px;
  right: -3px;
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
  width: 26px;
  height: 26px;
  padding: 0;
  border: 1px solid transparent;
  background: transparent;
  color: var(--coar-icon-neutral-secondary, #5a5a60);
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.12s, color 0.12s, border-color 0.12s;
}
.pb-builder__icon-btn:hover:not(:disabled) {
  background: var(--coar-surface-neutral-subtle, #f0f0f2);
  border-color: var(--coar-border-neutral, #dcdce0);
  color: var(--coar-icon-neutral-primary, #111);
}
.pb-builder__icon-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.pb-builder__icon-btn--corner {
  position: absolute;
  top: 9px;
  right: 10px;
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
  background: var(--coar-surface-neutral-subtle, #f0f0f2);
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
  border-bottom: 1px solid var(--coar-border-neutral, #e2e2e6);
  background: var(--coar-surface-neutral-subtle, #f7f7f9);
  flex-shrink: 0;
}

.pb-builder__seg {
  display: inline-flex;
  border: 1px solid var(--coar-border-neutral, #d0d0d0);
  border-radius: 6px;
  overflow: hidden;
  background: var(--coar-surface-base, #fff);
}

.pb-builder__seg-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border: none;
  background: transparent;
  color: var(--coar-text-neutral-secondary, #555);
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.12s, color 0.12s;
}

.pb-builder__seg-btn + .pb-builder__seg-btn {
  border-left: 1px solid var(--coar-border-neutral, #d0d0d0);
}

.pb-builder__seg-btn:hover:not(.pb-builder__seg-btn--active) {
  background: var(--coar-surface-neutral-subtle, #f0f0f2);
}

.pb-builder__seg-btn--active {
  background: var(--coar-surface-accent-subtle, #e6eefa);
  color: var(--coar-text-accent, #1666cc);
  font-weight: 600;
}

.pb-builder__preview {
  padding: 20px 24px;
  overflow: auto;
  flex: 1;
  min-height: 0;
  box-sizing: border-box;
  background:
    repeating-linear-gradient(
      45deg,
      rgba(0, 0, 0, 0.015) 0px,
      rgba(0, 0, 0, 0.015) 6px,
      transparent 6px,
      transparent 12px
    );
}

.pb-builder__preview-frame {
  background: var(--coar-surface-default, #fff);
  border: 1px solid var(--coar-border-neutral, #e2e2e6);
  border-radius: 8px;
  overflow: hidden;
  transition: max-width 0.18s ease-out, width 0.18s ease-out;
}

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
  background: var(--coar-surface-neutral-subtle, #f7f7f9);
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
  background: var(--coar-surface-neutral-subtle, #f7f7f9);
  line-height: 1.55;
}
</style>
