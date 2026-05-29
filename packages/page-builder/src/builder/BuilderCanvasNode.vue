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
import {
  CoarIcon,
  CoarButton,
  CoarCheckbox,
  CoarDivider,
  CoarFormField,
  CoarSelect,
  CoarTextInput,
  CoarPasswordInput,
  setCoarDragImageFromElement,
  type CoreIconName,
  type CoarSelectOption,
} from '@cocoar/vue-ui';
import { isContainerNode, type PageNode, type ElementType } from '../schema';
import { selfLayoutStyle, containerLayoutStyle } from '../styleMapping';
import { BUILDER_API, BUILDER_CONFIG } from './builderContext';
import { useBuilderDnd } from './useBuilderDnd';
import type { NodePath } from './operations';

defineOptions({ name: 'BuilderCanvasNode' });

interface Props {
  node: PageNode;
  path: NodePath;
}

const props = defineProps<Props>();

const builder = inject(BUILDER_API)!;
const config = inject(BUILDER_CONFIG);
const dnd = useBuilderDnd();

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

const typeIcon: Record<ElementType, CoreIconName> = {
  page: 'file',
  stack: 'layers',
  card: 'square-dashed',
  section: 'panel-left',
  divider: 'minus',
  spacer: 'more-horizontal',
  heading: 'heading',
  paragraph: 'pilcrow',
  'text-input': 'file-text',
  checkbox: 'check-circle-2',
  select: 'list',
  button: 'zap',
  link: 'link',
  image: 'image',
};

const typeLabel = computed(() => {
  const n = props.node as PageNode & { text?: string; label?: string; title?: string; name?: string };
  if (n.text) return `${n.type} · ${String(n.text).slice(0, 24)}`;
  if (n.label) return `${n.type} · ${String(n.label).slice(0, 24)}`;
  if (n.title) return `${n.type} · ${String(n.title).slice(0, 24)}`;
  if (n.name) return `${n.type} · ${String(n.name)}`;
  return n.type;
});

const colorFamily = computed<'container' | 'element'>(() => isContainerNode(props.node) ? 'container' : 'element');

/** Direction of this container — drives dropzone axis + child flex behavior. */
const containerDirection = computed<FlexDirection>(() => {
  const n = props.node;
  if (n.type === 'stack') return n.direction ?? 'column';
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
  if (!isContainerNode(n)) return {};
  const direction = n.type === 'stack' ? (n.direction ?? 'column') : 'column';
  const css: CSSProperties = {
    display: 'flex',
    flexDirection: direction,
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

/**
 * Inline-natured leaf previews (button / link / image) are content-width by
 * default. When the node is sized (fill / fixed / explicit width) the rendered
 * element fills its box, so the preview should too — `width: 100%` fills the
 * chrome wrapper's content area (no overflow from the wrapper's own padding).
 * Block leaves (text, headings, form fields) already fill their wrapper.
 */
const leafSizeStyle = computed<CSSProperties>(() => {
  const s = props.node.style;
  const sized = !!s && (s.size === 'fill' || s.size === 'fixed' || (!s.size && !!s.width));
  return sized ? { width: '100%' } : {};
});

// ── Select options ────────────────────────────────────────────────────────────

function toSelectOptions(options?: { value: string; label: string }[]): CoarSelectOption<string>[] {
  return (options ?? []).map((o) => ({ value: o.value, label: o.label }));
}

// ── Selection ────────────────────────────────────────────────────────────────

function onClick(e: MouseEvent) {
  e.stopPropagation();
  builder.select(props.path);
}

// ── Drag source (tab handle) ─────────────────────────────────────────────────

function onTabDragStart(e: DragEvent) {
  if (isRoot.value) { e.preventDefault(); return; }
  if (!e.dataTransfer) return;
  dnd.startDrag({ kind: 'move', path: [...props.path] });
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', 'move');
  const wrapper = (e.currentTarget as HTMLElement | null)?.closest('.canvas-node') as HTMLElement | null;
  if (wrapper) setCoarDragImageFromElement(e, wrapper, { offsetX: 20, offsetY: 16 });
  e.stopPropagation();
}

function onTabDragEnd() { dnd.endDrag(); }

// ── Drop zones ────────────────────────────────────────────────────────────────

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

function onZoneDragEnter(e: DragEvent, index: number) {
  const accepted = dnd.onZoneEnter(zoneKey(index), props.path);
  if (accepted) e.preventDefault();
}
function onZoneDragOver(e: DragEvent, index: number) {
  if (dnd.canDrop(props.path)) {
    e.preventDefault();
    if (!isZoneActive(index)) dnd.onZoneEnter(zoneKey(index), props.path);
  }
}
function onZoneDragLeave(index: number) { dnd.onZoneLeave(zoneKey(index)); }
function onZoneDrop(e: DragEvent, index: number) {
  e.preventDefault();
  e.stopPropagation();
  dnd.onZoneDrop([...props.path], index);
  dnd.endDrag();
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
      },
    ]"
    :style="wrapperStyle"
    @click="onClick"
  >
    <!-- Type tab (drag handle) -->
    <span
      class="canvas-node__tab"
      :class="{ 'canvas-node__tab--grabbable': !isRoot }"
      :title="typeLabel"
      :draggable="!isRoot"
      @dragstart="onTabDragStart"
      @dragend="onTabDragEnd"
    >
      <CoarIcon :name="typeIcon[node.type]" size="xs" />
      <span class="canvas-node__tab-label">{{ typeLabel }}</span>
    </span>

    <!-- Delete button (top-right) -->
    <button
      v-if="!isRoot"
      type="button"
      class="canvas-node__delete"
      title="Delete"
      @click.stop="builder.remove(path)"
    >
      <CoarIcon name="x" size="xs" />
    </button>

    <!-- ── Container body ── -->
    <div
      v-if="isContainerNode(node)"
      class="canvas-node__body"
      :class="[
        `canvas-node__body--${node.type}`,
        `canvas-node__body--dir-${containerDirection}`,
      ]"
      :style="layoutStyle"
    >
      <!-- Section title preview -->
      <div
        v-if="node.type === 'section' && (node as any).title"
        class="canvas-node__section-title"
      >
        {{ (node as any).title }}
      </div>

      <template v-if="node.children.length === 0">
        <div
          class="canvas-dropzone canvas-dropzone--empty"
          :class="zoneClasses(0)"
          :data-dropzone="zoneKey(0)"
          @dragenter="onZoneDragEnter($event, 0)"
          @dragover="onZoneDragOver($event, 0)"
          @dragleave="onZoneDragLeave(0)"
          @drop="onZoneDrop($event, 0)"
        >
          Empty {{ node.type }} — drop something here
        </div>
      </template>

      <template v-else>
        <div
          class="canvas-dropzone"
          :class="[`canvas-dropzone--${containerDirection}`, zoneClasses(0)]"
          :data-dropzone="zoneKey(0)"
          aria-hidden="true"
          @dragenter="onZoneDragEnter($event, 0)"
          @dragover="onZoneDragOver($event, 0)"
          @dragleave="onZoneDragLeave(0)"
          @drop="onZoneDrop($event, 0)"
        />
        <template v-for="(child, i) in node.children" :key="child.id">
          <BuilderCanvasNode :node="child" :path="[...path, i]" />
          <div
            class="canvas-dropzone"
            :class="[`canvas-dropzone--${containerDirection}`, zoneClasses(i + 1)]"
            :data-dropzone="zoneKey(i + 1)"
            aria-hidden="true"
            @dragenter="onZoneDragEnter($event, i + 1)"
            @dragover="onZoneDragOver($event, i + 1)"
            @dragleave="onZoneDragLeave(i + 1)"
            @drop="onZoneDrop($event, i + 1)"
          />
        </template>
      </template>
    </div>

    <!-- ── Leaf node previews (pointer-events: none so clicks fall to canvas-node) ── -->
    <div v-else class="canvas-node__preview">

      <CoarDivider v-if="node.type === 'divider'" />

      <div v-else-if="node.type === 'spacer'" class="canvas-node__spacer-preview" />

      <component
        :is="`h${(node as any).level ?? 2}`"
        v-else-if="node.type === 'heading'"
        class="canvas-node__heading"
      >
        {{ (node as any).text || 'Heading' }}
      </component>

      <p v-else-if="node.type === 'paragraph'" class="canvas-node__paragraph">
        {{ (node as any).text || 'Paragraph text.' }}
      </p>

      <CoarFormField
        v-else-if="node.type === 'text-input'"
        :label="(node as any).label"
        :required="(node as any).validation?.required"
      >
        <CoarPasswordInput
          v-if="(node as any).inputType === 'password'"
          :model-value="''"
          :placeholder="(node as any).placeholder"
          disabled
        />
        <CoarTextInput
          v-else
          :model-value="''"
          :placeholder="(node as any).placeholder"
          readonly
        />
      </CoarFormField>

      <CoarCheckbox
        v-else-if="node.type === 'checkbox'"
        :model-value="false"
        :label="(node as any).label || 'Checkbox'"
        :required="(node as any).validation?.required"
        disabled
      />

      <CoarFormField
        v-else-if="node.type === 'select'"
        :label="(node as any).label"
        :required="(node as any).validation?.required"
      >
        <CoarSelect
          :model-value="null"
          :options="toSelectOptions((node as any).options)"
          :placeholder="(node as any).placeholder"
          disabled
        />
      </CoarFormField>

      <CoarButton
        v-else-if="node.type === 'button'"
        :variant="(node as any).variant ?? 'primary'"
        :size="(node as any).size"
        :style="leafSizeStyle"
        disabled
      >
        {{ (node as any).label || 'Button' }}
      </CoarButton>

      <button v-else-if="node.type === 'link'" class="canvas-node__link" type="button" :style="leafSizeStyle">
        {{ (node as any).label || 'Link' }}
      </button>

      <template v-else-if="node.type === 'image'">
        <img
          v-if="(node as any).assetId && resolveAsset((node as any).assetId)"
          :src="resolveAsset((node as any).assetId)"
          :alt="(node as any).alt ?? ''"
          class="canvas-node__image-preview"
          :style="leafSizeStyle"
        />
        <div v-else class="canvas-node__image-placeholder">
          <CoarIcon name="image" size="m" />
          <span>{{ (node as any).assetId || 'No image' }}</span>
        </div>
      </template>

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

.canvas-node__tab--grabbable { cursor: grab; }
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

/* ── Leaf node previews ───────────────────────────────────────────────────── */
.canvas-node__preview { pointer-events: none; }

.canvas-node__spacer-preview {
  height: 20px;
  background: repeating-linear-gradient(
    45deg,
    rgba(0, 0, 0, 0.03) 0px,
    rgba(0, 0, 0, 0.03) 4px,
    transparent 4px,
    transparent 8px
  );
  border-radius: 2px;
  border: 1px dashed rgba(0, 0, 0, 0.12);
}

.canvas-node__heading {
  margin: 0;
  font-weight: 600;
  color: var(--coar-text-neutral-primary, #111);
}

h1.canvas-node__heading { font-size: 28px; }
h2.canvas-node__heading { font-size: 22px; }
h3.canvas-node__heading { font-size: 18px; }
h4.canvas-node__heading { font-size: 15px; }
h5.canvas-node__heading { font-size: 13px; }
h6.canvas-node__heading { font-size: 12px; }

.canvas-node__paragraph {
  margin: 0;
  font-size: 14px;
  color: var(--coar-text-neutral-secondary, #555);
}

.canvas-node__link {
  background: none;
  border: none;
  padding: 0;
  cursor: default;
  color: var(--coar-text-accent, #1666cc);
  font-size: 14px;
  text-decoration: underline;
}

.canvas-node__image-preview {
  display: block;
  max-width: 100%;
  height: auto;
  border-radius: 4px;
}

.canvas-node__image-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 20px;
  background: var(--coar-surface-subtle, #f7f7f9);
  border: 1px dashed rgba(0, 0, 0, 0.15);
  border-radius: 4px;
  color: var(--coar-text-neutral-secondary, #888);
  font-size: 12px;
}
</style>
