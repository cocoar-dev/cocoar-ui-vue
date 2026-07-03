<script setup lang="ts">
import { computed, inject } from 'vue';
import { CoarIcon, type CoreIconName } from '@cocoar/vue-ui';
import { BUILDER_API, BUILDER_CONFIG } from './builderContext';
import BuilderCanvasNode from './BuilderCanvasNode.vue';
import { useBuilderDnd } from './useBuilderDnd';
import { isElementAllowed, type ElementType } from '../schema';

defineOptions({ name: 'BuilderCanvas' });

const builder = inject(BUILDER_API)!;
const config = inject(BUILDER_CONFIG);
const dnd = useBuilderDnd();

/** Hide palette entries for types that aren't allowed by the config. */
const visiblePalette = computed(() =>
  paletteEntries.filter((e) => isElementAllowed(e.type, config?.value)),
);

interface PaletteEntry {
  type: ElementType;
  label: string;
  icon: CoreIconName;
  group: 'container' | 'element';
}

const paletteEntries: ReadonlyArray<PaletteEntry> = [
  { type: 'stack',      label: 'Stack',      icon: 'layers',         group: 'container' },
  { type: 'card',       label: 'Card',       icon: 'square-dashed',  group: 'container' },
  { type: 'section',    label: 'Section',    icon: 'panel-left',     group: 'container' },
  { type: 'heading',    label: 'Heading',    icon: 'heading',        group: 'element' },
  { type: 'paragraph',  label: 'Paragraph',  icon: 'pilcrow',        group: 'element' },
  { type: 'divider',    label: 'Divider',    icon: 'minus',          group: 'element' },
  { type: 'spacer',     label: 'Spacer',     icon: 'more-horizontal', group: 'element' },
  { type: 'text-input', label: 'Text Input', icon: 'file-text',      group: 'element' },
  { type: 'checkbox',   label: 'Checkbox',   icon: 'check-circle-2', group: 'element' },
  { type: 'select',     label: 'Select',     icon: 'list',           group: 'element' },
  { type: 'button',     label: 'Button',     icon: 'zap',            group: 'element' },
  { type: 'link',       label: 'Link',       icon: 'link',           group: 'element' },
  { type: 'image',      label: 'Image',      icon: 'image',          group: 'element' },
];

function isPaletteDragging(type: ElementType): boolean {
  const p = dnd.payload.value;
  return !!(p && p.kind === 'new' && p.type === type);
}

function onCardPointerDown(e: PointerEvent, type: ElementType) {
  dnd.onHandlePointerDown(e, { kind: 'new', type });
}

function onCanvasBackgroundClick() { builder.select([]); }
</script>

<template>
  <div class="pb-canvas-shell">
    <!-- ── Palette toolbar ── -->
    <div class="pb-palette">
      <div class="pb-palette__group">
        <span class="pb-palette__label">Containers</span>
        <button
          v-for="entry in visiblePalette.filter((e) => e.group === 'container')"
          :key="entry.type"
          type="button"
          class="pb-palette__card pb-palette__card--container"
          :class="{ 'pb-palette__card--dragging': isPaletteDragging(entry.type) }"
          :title="`Drag to add ${entry.label}`"
          @pointerdown="onCardPointerDown($event, entry.type)"
        >
          <CoarIcon :name="entry.icon" size="s" />
          <span>{{ entry.label }}</span>
        </button>
      </div>
      <div class="pb-palette__divider" />
      <div class="pb-palette__group">
        <span class="pb-palette__label">Elements</span>
        <button
          v-for="entry in visiblePalette.filter((e) => e.group === 'element')"
          :key="entry.type"
          type="button"
          class="pb-palette__card pb-palette__card--element"
          :class="{ 'pb-palette__card--dragging': isPaletteDragging(entry.type) }"
          :title="`Drag to add ${entry.label}`"
          @pointerdown="onCardPointerDown($event, entry.type)"
        >
          <CoarIcon :name="entry.icon" size="s" />
          <span>{{ entry.label }}</span>
        </button>
      </div>
    </div>

    <!-- ── Canvas surface ── -->
    <div
      class="pb-canvas"
      :class="{ 'pb-canvas--dragging': dnd.isDragging.value }"
      @click.self="onCanvasBackgroundClick"
    >
      <BuilderCanvasNode :node="builder.schema.value" :path="[]" />
    </div>
  </div>
</template>

<style scoped>
.pb-canvas-shell {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* ── Palette ─────────────────────────────────────────────────────────────── */
.pb-palette {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: var(--coar-surface-neutral-subtle, #f7f7f9);
  border-bottom: 1px solid var(--coar-border-neutral, #e2e2e6);
  flex-wrap: wrap;
  flex-shrink: 0;
}

.pb-palette__group {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.pb-palette__label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--coar-text-neutral-tertiary, #8a8a90);
  margin-right: 2px;
  white-space: nowrap;
}

.pb-palette__divider {
  width: 1px;
  height: 20px;
  background: var(--coar-border-neutral, #d8d8dc);
  flex-shrink: 0;
}

.pb-palette__card {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 24px;
  padding: 0 7px;
  background: #fff;
  border: 1px solid var(--card-border, rgba(102, 102, 110, 0.25));
  color: var(--card-fg, #5a5a60);
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  border-radius: 4px;
  cursor: grab;
  transition: background-color 0.12s, border-color 0.12s, transform 0.08s;
  user-select: none;
  white-space: nowrap;
  /* The pointer-drag engine owns the gesture — without this, touch browsers
     turn the drag into a scroll and fire pointercancel mid-gesture. */
  touch-action: none;
}

.pb-palette__card:hover {
  background: var(--card-bg-hover, rgba(22, 102, 204, 0.06));
  border-color: var(--card-border-hover, rgba(22, 102, 204, 0.4));
  color: var(--card-fg-hover, #1666cc);
}

.pb-palette__card:active { transform: scale(0.97); }
.pb-palette__card--dragging { opacity: 0.4; cursor: grabbing; }

.pb-palette__card--container {
  --card-fg: #1666cc;
  --card-fg-hover: #1666cc;
  --card-border: rgba(22, 102, 204, 0.3);
  --card-border-hover: rgba(22, 102, 204, 0.55);
  --card-bg-hover: rgba(22, 102, 204, 0.08);
}
.pb-palette__card--element {
  --card-fg: #047857;
  --card-fg-hover: #047857;
  --card-border: rgba(5, 150, 105, 0.3);
  --card-border-hover: rgba(5, 150, 105, 0.55);
  --card-bg-hover: rgba(5, 150, 105, 0.08);
}

/* ── Canvas surface ──────────────────────────────────────────────────────── */
.pb-canvas {
  flex: 1;
  overflow: auto;
  padding: 28px 20px 20px;
  background:
    repeating-linear-gradient(
      45deg,
      rgba(0, 0, 0, 0.015) 0px,
      rgba(0, 0, 0, 0.015) 6px,
      transparent 6px,
      transparent 12px
    );
}
</style>
