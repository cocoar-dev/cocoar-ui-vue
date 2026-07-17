<script lang="ts">
import type { InjectionKey, ComputedRef } from 'vue';
import type { FlexDirection } from '../styleMapping';

/**
 * Nearest flex-container direction, provided down the canvas tree so a node can
 * map `size: 'fill'` to the right axis — mirrors the renderer (PageNode.vue) so
 * Editor and Preview agree. Module-scoped: all instances share the key.
 */
const CANVAS_PARENT_DIRECTION: InjectionKey<ComputedRef<FlexDirection>> =
  Symbol('canvas-parent-direction');
</script>

<script setup lang="ts">
import { computed, inject, provide, type CSSProperties } from 'vue';
import { CoarIcon } from '@cocoar/vue-ui';
import { useI18n } from '@cocoar/vue-localization';
import { isElementAllowed, type ElementNode, type PageNode, type StackNode } from '../schema';
import { selfLayoutStyle, containerLayoutStyle } from '../styleMapping';
import { useMergedElements } from '../elements/useMergedElements';
import { BUILDER_API, BUILDER_CONFIG } from './builderContext';
import { useBuilderDnd } from './useBuilderDnd';
import type { NodePath } from './operations';

defineOptions({ name: 'BuilderCanvasNode' });

const props = defineProps<{
  node: PageNode;
  path: NodePath;
}>();

const builder = inject(BUILDER_API)!;
const config = inject(BUILDER_CONFIG);
const dnd = useBuilderDnd();
const elements = useMergedElements(config);
const { t } = useI18n();

/**
 * Registry dispatch: the definition supplies preview/icon/container-ness; the
 * page root is host-owned (not a registry entry).
 */
const def = computed(() =>
  props.node.type === 'page' ? undefined : elements.value[props.node.type],
);

function resolveAsset(id: string): string {
  return config?.value?.assetResolver?.(id) ?? '';
}

const isRoot = computed(() => props.path.length === 0);
const pathKey = computed(() => props.path.join('/'));

const isDraggingSource = computed(() => {
  const p = dnd.payload.value;
  if (!p || p.kind !== 'move') return false;
  return p.path.length === props.path.length && p.path.every((v, i) => v === props.path[i]);
});

const isSelected = computed(() => {
  const sel = builder.selectedPath.value;
  return sel !== null && sel.length === props.path.length && sel.every((v, i) => v === props.path[i]);
});

// ── Type icon + label ────────────────────────────────────────────────────────

const typeLabel = computed(() => {
  const n = props.node as PageNode & { props?: { text?: string; label?: string; title?: string }; name?: string };
  if (n.props?.text) return `${n.type} · ${String(n.props.text).slice(0, 24)}`;
  if (n.props?.label) return `${n.type} · ${String(n.props.label).slice(0, 24)}`;
  if (n.props?.title) return `${n.type} · ${String(n.props.title).slice(0, 24)}`;
  if (n.name) return `${n.type} · ${String(n.name)}`;
  return n.type;
});

const tabIcon = computed(
  () => def.value?.builder?.icon ?? (props.node.type === 'page' ? 'file' : 'circle-alert'),
);

// ── Conditional visibility: the canvas always shows the node (authoring
//    surface), but marks it so authors see it may be hidden at runtime. ──
const visibilityCondition = computed(() => (props.node as ElementNode).visibleWhen);
const visibilityHint = computed(() =>
  t(
    'coar.pageBuilder.canvas.visibleWhen',
    { field: String(visibilityCondition.value?.field ?? '') },
    'Shown conditionally — depends on "{field}"',
  ),
);

/** Container-ness comes from the registry (page root is host-owned). */
const isContainer = computed(
  () => props.node.type === 'page' || def.value?.container === true,
);

const colorFamily = computed<'container' | 'element'>(() => isContainer.value ? 'container' : 'element');

/** Children, guarded: malformed trees may drop the array on a custom container. */
const children = computed<PageNode[]>(() => {
  const n = props.node as PageNode & { children?: PageNode[] };
  return n.children ?? [];
});

// ── Runtime-blocked nodes get a VISIBLE treatment: the runtime renderer skips
//    them, and the canvas must not pretend otherwise (Editor ≈ Preview). ──
const isUnknownType = computed(() => props.node.type !== 'page' && !def.value);
const isBlocked = computed(
  () => isUnknownType.value || !isElementAllowed(props.node.type, config?.value),
);
const blockedHint = computed(() =>
  isUnknownType.value
    ? t('coar.pageBuilder.canvas.unknownType', { type: String(props.node.type) }, 'Unknown type "{type}" — skipped at runtime')
    : t('coar.pageBuilder.canvas.notAllowed', undefined, 'Not in allowedElements — skipped at runtime'),
);

/** Direction of this container — drives dropzone axis + child flex behavior. */
const containerDirection = computed<FlexDirection>(() => {
  const n = props.node;
  // Cast: the open union member absorbs the 'stack' narrowing.
  if (n.type === 'stack') return (n as StackNode).props.direction ?? 'column';
  return 'column';
});

// Direction-aware sizing (mirrors PageNode.vue): read the parent's direction,
// provide our own to children.
const parentDirection = inject(CANVAS_PARENT_DIRECTION, undefined);
provide(CANVAS_PARENT_DIRECTION, containerDirection);

// ── Layout (shares styleMapping.ts with the real renderer, so Editor ≈ Preview) ─

/** Inner layout of a container: gap + justify-content + align-items (+ flex box). */
const layoutStyle = computed<CSSProperties>(() => {
  const n = props.node;
  if (!isContainer.value) return {};
  const css: CSSProperties = {
    display: 'flex',
    flexDirection: containerDirection.value,
    ...containerLayoutStyle(n.style),
  };
  // page/section/stack apply the node's padding here; card uses its own chrome.
  if (n.type !== 'card' && n.style?.padding) css.padding = n.style.padding;
  return css;
});

/**
 * The chrome wrapper IS the flex child of the parent container, so the node's
 * self-alignment (`align-self`) and sizing (`size`/`width`) belong here — same
 * mapping the real renderer applies to the node element itself.
 */
const wrapperStyle = computed<CSSProperties>(() =>
  selfLayoutStyle(props.node.style, parentDirection?.value ?? 'column'),
);

// ── Selection ────────────────────────────────────────────────────────────────

function onClick(e: MouseEvent) {
  e.stopPropagation();
  builder.select(props.path);
}

// Enter/Space on the focused node selects it; keys originating from inner
// interactive elements (delete/duplicate buttons, nested nodes) pass through.
function onNodeKeydown(e: KeyboardEvent) {
  if (e.target !== e.currentTarget) return;
  if (e.key !== 'Enter' && e.key !== ' ') return;
  e.preventDefault();
  e.stopPropagation();
  builder.select(props.path);
}

// ── Drag source (tab handle) ─────────────────────────────────────────────────

function onTabPointerDown(e: PointerEvent) {
  if (isRoot.value) return;
  const ghostFrom = (e.currentTarget as HTMLElement | null)?.closest<HTMLElement>('.canvas-node');
  dnd.onHandlePointerDown(e, { kind: 'move', path: [...props.path] }, ghostFrom);
}

// ── Drop zones (declared via data attributes; the pointer engine hit-tests) ──

function zoneKey(index: number): string { return `${pathKey.value}:${index}`; }
function isZoneActive(index: number): boolean { return dnd.activeZoneKey.value === zoneKey(index); }

function zoneClasses(index: number): Record<string, boolean> {
  const dragging = dnd.isDragging.value;
  const accepts = dnd.canDrop(props.path);
  return {
    'canvas-dropzone--drag-active': dragging && accepts,
    'canvas-dropzone--disabled': dragging && !accepts,
    'canvas-dropzone--over': isZoneActive(index),
  };
}
</script>

<template>
  <div
    class="canvas-node"
    :class="[
      `canvas-node--${colorFamily}`,
      {
        'canvas-node--selected': isSelected,
        'canvas-node--root': isRoot,
        'canvas-node--dragging': isDraggingSource,
        'canvas-node--blocked': isBlocked,
      },
    ]"
    :style="wrapperStyle"
    tabindex="0"
    @click="onClick"
    @keydown="onNodeKeydown"
  >
    <!-- Type tab (drag handle) -->
    <span
      class="canvas-node__tab"
      :class="{ 'canvas-node__tab--grabbable': !isRoot }"
      :title="typeLabel"
      @pointerdown="onTabPointerDown"
    >
      <CoarIcon :name="tabIcon" size="xs" />
      <span class="canvas-node__tab-label">{{ typeLabel }}</span>
      <span v-if="visibilityCondition" class="canvas-node__tab-eye" :title="visibilityHint">
        <CoarIcon name="eye" size="xs" />
      </span>
    </span>

    <!-- Runtime-blocked hint -->
    <div v-if="isBlocked" class="canvas-node__blocked" role="note">
      <CoarIcon name="circle-alert" size="xs" />
      <span>{{ blockedHint }}</span>
    </div>

    <!-- Duplicate + delete buttons (top-right) -->
    <button
      v-if="!isRoot"
      type="button"
      class="canvas-node__delete canvas-node__duplicate"
      :title="t('coar.pageBuilder.common.duplicate', undefined, 'Duplicate')"
      @click.stop="builder.duplicate(path)"
    >
      <CoarIcon name="copy" size="xs" />
    </button>
    <button
      v-if="!isRoot"
      type="button"
      class="canvas-node__delete"
      :title="t('coar.pageBuilder.common.delete', undefined, 'Delete')"
      @click.stop="builder.remove(path)"
    >
      <CoarIcon name="x" size="xs" />
    </button>

    <!-- ── Container body ── -->
    <div
      v-if="isContainer"
      class="canvas-node__body"
      :class="[
        `canvas-node__body--${node.type}`,
        `canvas-node__body--dir-${containerDirection}`,
      ]"
      :style="layoutStyle"
    >
      <!-- Section title preview -->
      <div
        v-if="node.type === 'section' && (node as any).props?.title"
        class="canvas-node__section-title"
      >
        {{ (node as any).props.title }}
      </div>

      <template v-if="children.length === 0">
        <div
          class="canvas-dropzone canvas-dropzone--empty"
          :class="zoneClasses(0)"
          :data-dropzone="zoneKey(0)"
          :data-pb-zone-path="pathKey"
          :data-pb-zone-index="0"
        >
          {{ t('coar.pageBuilder.canvas.emptyContainer', { type: node.type }, 'Empty {type} — drop something here') }}
        </div>
      </template>

      <template v-else>
        <div
          class="canvas-dropzone"
          :class="[`canvas-dropzone--${containerDirection}`, zoneClasses(0)]"
          :data-dropzone="zoneKey(0)"
          :data-pb-zone-path="pathKey"
          :data-pb-zone-index="0"
          data-pb-zone-inflate="8"
          aria-hidden="true"
        />
        <template v-for="(child, i) in children" :key="child.id">
          <BuilderCanvasNode :node="child" :path="[...path, i]" />
          <div
            class="canvas-dropzone"
            :class="[`canvas-dropzone--${containerDirection}`, zoneClasses(i + 1)]"
            :data-dropzone="zoneKey(i + 1)"
            :data-pb-zone-path="pathKey"
            :data-pb-zone-index="i + 1"
            data-pb-zone-inflate="8"
            aria-hidden="true"
          />
        </template>
      </template>
    </div>

    <!-- ── Leaf node preview (pointer-events: none so clicks fall to canvas-node) ── -->
    <div v-else class="canvas-node__preview">
      <component
        :is="def!.builder!.preview"
        v-if="def?.builder?.preview"
        :node="node"
        :resolve-asset="resolveAsset"
      />
      <!-- Registered but no preview component: neutral icon + label chip. -->
      <div v-else-if="def" class="canvas-node__generic-preview">
        <CoarIcon :name="def.builder?.icon ?? 'puzzle'" size="s" />
        <span>{{ typeLabel }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Color families ───────────────────────────────────────────────────────── */
.canvas-node {
  --canvas-border: rgba(102, 102, 110, 0.3);
  --canvas-border-selected: rgba(22, 102, 204, 0.7);
  --canvas-tab-fg: #5a5a60;
  --canvas-tab-bg: #fff;
  --canvas-tab-border: rgba(102, 102, 110, 0.35);
}
.canvas-node--container {
  --canvas-border: rgba(22, 102, 204, 0.38);
  --canvas-tab-fg: #1666cc;
  --canvas-tab-border: rgba(22, 102, 204, 0.45);
}
.canvas-node--element {
  --canvas-border: rgba(5, 150, 105, 0.35);
  --canvas-tab-fg: #047857;
  --canvas-tab-border: rgba(5, 150, 105, 0.45);
}

/* ── Base wrapper ─────────────────────────────────────────────────────────── */
.canvas-node {
  position: relative;
  box-sizing: border-box;
  border: 1px dashed var(--canvas-border);
  border-radius: 6px;
  padding: 16px 10px 10px;
  cursor: pointer;
  transition: border-color 0.12s ease-out, background-color 0.12s ease-out;
  min-width: 0;
}

.canvas-node:hover { background: rgba(22, 102, 204, 0.03); }

.canvas-node--selected {
  border-color: var(--canvas-border-selected);
  border-style: solid;
  background: rgba(22, 102, 204, 0.05);
}

.canvas-node--dragging { opacity: 0.4; }

/* ── Runtime-blocked (unknown type / not in allowedElements) ── */
.canvas-node--blocked {
  --canvas-border: rgba(192, 57, 43, 0.5);
  --canvas-tab-fg: #c0392b;
  --canvas-tab-border: rgba(192, 57, 43, 0.55);
  background: repeating-linear-gradient(
    45deg,
    rgba(192, 57, 43, 0.04) 0px,
    rgba(192, 57, 43, 0.04) 6px,
    transparent 6px,
    transparent 12px
  );
}

.canvas-node__blocked {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 2px 0 6px;
  font-size: 11px;
  font-weight: 500;
  color: var(--coar-text-semantic-error-bold, #c0392b);
}

.canvas-node--root {
  padding: 20px 14px 14px;
  min-height: 80px;
}

/* ── Type tab ─────────────────────────────────────────────────────────────── */
.canvas-node__tab {
  position: absolute;
  top: -9px;
  left: 10px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 18px;
  padding: 0 6px;
  background: var(--canvas-tab-bg);
  border: 1px solid var(--canvas-tab-border);
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  color: var(--canvas-tab-fg);
  white-space: nowrap;
  max-width: calc(100% - 40px);
  overflow: hidden;
  text-overflow: ellipsis;
  user-select: none;
}

.canvas-node__tab--grabbable {
  cursor: grab;
  /* The pointer-drag engine owns the gesture on this handle. */
  touch-action: none;
}
.canvas-node__tab--grabbable:active { cursor: grabbing; }

.canvas-node--selected .canvas-node__tab {
  border-color: var(--canvas-border-selected);
  color: var(--canvas-border-selected);
  font-weight: 600;
}

.canvas-node__tab-label {
  line-height: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Conditional-visibility marker: the node may be hidden at runtime. */
.canvas-node__tab-eye {
  display: inline-flex;
  align-items: center;
  opacity: 0.75;
  flex-shrink: 0;
}

/* ── Delete button ────────────────────────────────────────────────────────── */
.canvas-node__delete {
  position: absolute;
  top: -9px;
  right: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: 1px solid var(--canvas-tab-border);
  background: var(--canvas-tab-bg);
  color: var(--canvas-tab-fg);
  border-radius: 4px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.12s ease-out, background-color 0.12s ease-out,
    border-color 0.12s ease-out, color 0.12s ease-out;
}

.canvas-node:hover:not(:has(.canvas-node:hover)) > .canvas-node__delete,
.canvas-node--selected > .canvas-node__delete { opacity: 1; }

.canvas-node__duplicate { right: 34px; }

.canvas-node:focus-visible {
  outline: 2px solid var(--coar-border-focus, #1666cc);
  outline-offset: 1px;
}

.canvas-node__delete:hover {
  background: var(--coar-surface-semantic-error-subtle, #fde8e4);
  border-color: var(--coar-text-semantic-error-bold, #c0392b);
  color: var(--coar-text-semantic-error-bold, #c0392b);
}

/* ── Container body ───────────────────────────────────────────────────────── */
.canvas-node__body { min-height: 24px; }

/*
 * Row children are natural-width by default and may shrink below content
 * (prevents overflow). Growing to fill is opt-in via `size: 'fill'`, applied as
 * an inline flex on the wrapper (see styleMapping.ts) — not forced here.
 */
.canvas-node__body--dir-row > .canvas-node {
  min-width: 0;
}

.canvas-node__body--card {
  background: var(--coar-surface-default, #fff);
  border: 1px solid var(--coar-border-neutral, #e0e0e0);
  border-radius: 6px;
  padding: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.07);
}

.canvas-node__section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--coar-text-neutral-primary, #111);
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--coar-border-neutral, #e0e0e0);
}

/* ── Drop zones ───────────────────────────────────────────────────────────── */
.canvas-dropzone {
  border: 1px dashed rgba(22, 102, 204, 0.45);
  background: rgba(22, 102, 204, 0.12);
  border-radius: 3px;
  flex-shrink: 0;
  box-sizing: border-box;
  transition: background-color 0.12s ease-out, border-color 0.12s ease-out,
    opacity 0.15s ease-out,
    width 0.14s ease-out, min-width 0.14s ease-out,
    height 0.14s ease-out, min-height 0.14s ease-out;
  opacity: 0;
  pointer-events: none;
}

.canvas-dropzone--empty {
  opacity: 1;
  pointer-events: auto;
  padding: 14px 12px;
  border-color: rgba(102, 102, 110, 0.25);
  background: rgba(102, 102, 110, 0.04);
  color: var(--coar-text-neutral-tertiary, #8a8a90);
  font-size: 12px;
  text-align: center;
  font-style: italic;
  min-height: unset;
  height: auto;
}

.canvas-dropzone--drag-active {
  border-color: rgba(22, 102, 204, 0.7);
  background: rgba(22, 102, 204, 0.2);
}

.canvas-dropzone--over {
  border-style: solid;
  border-color: rgba(22, 102, 204, 0.95);
  background: rgba(22, 102, 204, 0.35);
  box-shadow: inset 0 0 0 1px rgba(22, 102, 204, 0.6);
}

.canvas-dropzone--disabled {
  background: rgba(100, 100, 106, 0.08);
  border-color: rgba(100, 100, 106, 0.3);
  opacity: 0.55;
}

/*
 * Sizing strategy:
 *   - When NOT dragging: dropzones collapse to 0 so the visible gap matches
 *     the container's `gap` setting (no phantom space between children).
 *   - When dragging: a thin but clearly visible bar that spans the full
 *     cross-axis of the container.
 *   - When the cursor is over a zone: modestly bigger so the "drop here"
 *     state is unambiguous.
 *   - When dragging but this container rejects: stay invisible.
 */
.canvas-dropzone--row {
  width: 0;
  min-width: 0;
  align-self: stretch;
}
.canvas-dropzone--row.canvas-dropzone--drag-active { width: 10px; min-width: 10px; }
.canvas-dropzone--row.canvas-dropzone--over { width: 24px; min-width: 24px; }

.canvas-dropzone--column { height: 0; min-height: 0; width: auto; }
.canvas-dropzone--column.canvas-dropzone--drag-active { height: 10px; min-height: 10px; }
.canvas-dropzone--column.canvas-dropzone--over { height: 24px; min-height: 24px; }

/* ── Leaf node preview ────────────────────────────────────────────────────── */
.canvas-node__preview { pointer-events: none; }

/* Registered element without a preview component. */
.canvas-node__generic-preview {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px;
  border: 1px dashed rgba(102, 102, 110, 0.3);
  border-radius: 4px;
  color: var(--coar-text-neutral-secondary, #888);
  font-size: 12px;
}
</style>
