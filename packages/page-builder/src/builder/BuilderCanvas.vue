<script setup lang="ts">
import { computed, inject } from 'vue';
import { CoarIcon, type CoreIconName } from '@cocoar/vue-ui';
import { useI18n } from '@cocoar/vue-localization';
import { BUILDER_API, BUILDER_CONFIG } from './builderContext';
import BuilderCanvasNode from './BuilderCanvasNode.vue';
import { useBuilderDnd } from './useBuilderDnd';
import { useMergedElements } from '../elements/useMergedElements';
import { defaultElementForField } from '../elements/fieldContract';
import { isElementAllowed, type PageFieldSpec, type PageNode } from '../schema';

defineOptions({ name: 'BuilderCanvas' });

const builder = inject(BUILDER_API)!;
const config = inject(BUILDER_CONFIG);
const dnd = useBuilderDnd();
const elements = useMergedElements(config);
const { t } = useI18n();

interface PaletteEntry {
  type: string;
  label: string;
  icon: CoreIconName;
  group: 'container' | 'element';
}

/**
 * Palette derived from the merged registry (key order = palette order:
 * built-ins first, consumer registrations after); entries need a builder half
 * and must pass the allow-list.
 */
const visiblePalette = computed<PaletteEntry[]>(() =>
  Object.entries(elements.value)
    .filter(([type, def]) => def.builder && isElementAllowed(type, config?.value))
    .map(([type, def]) => ({
      type,
      label: t(def.builder!.label.key, undefined, def.builder!.label.fallback),
      icon: def.builder!.icon ?? 'circle-alert',
      group: def.builder!.group ?? 'element',
    })),
);

function isPaletteDragging(type: string): boolean {
  const p = dnd.payload.value;
  return !!(p && p.kind === 'new' && !p.bind && p.type === type);
}

function onCardPointerDown(e: PointerEvent, type: string) {
  dnd.onHandlePointerDown(e, { kind: 'new', type });
}

// ─── Field-first palette (config.fields) ──────────────────────────────────────
// The contract's fields are draggable too: dropping one creates its default
// element, pre-bound (name + label + required). Bound fields grey out.

const FIELD_TYPE_ICONS: Record<string, CoreIconName> = {
  string: 'file-text',
  number: 'hash',
  boolean: 'check',
  'string[]': 'list',
  date: 'calendar',
  datetime: 'calendar-days',
};

interface FieldPaletteEntry {
  field: PageFieldSpec;
  /** Element the drop creates; undefined = no compatible placeable element. */
  elementType?: string;
  bound: boolean;
  icon: CoreIconName;
  label: string;
}

const boundNames = computed(() => {
  const names = new Set<string>();
  const walk = (n: PageNode) => {
    const name = (n as { name?: string }).name;
    if (name) names.add(name);
    if ('children' in n && Array.isArray(n.children)) n.children.forEach(walk);
  };
  walk(builder.schema.value);
  return names;
});

const fieldPalette = computed<FieldPaletteEntry[]>(() =>
  (config?.value?.fields ?? []).map((field) => ({
    field,
    elementType: defaultElementForField(elements.value, field),
    bound: boundNames.value.has(field.name),
    icon: FIELD_TYPE_ICONS[field.valueType] ?? 'circle-alert',
    label: field.label ?? field.name,
  })),
);

function isFieldDragging(name: string): boolean {
  const p = dnd.payload.value;
  return !!(p && p.kind === 'new' && p.bind?.name === name);
}

function onFieldPointerDown(e: PointerEvent, entry: FieldPaletteEntry) {
  if (entry.bound || !entry.elementType) return;
  dnd.onHandlePointerDown(e, {
    kind: 'new',
    type: entry.elementType,
    bind: { name: entry.field.name, label: entry.field.label, required: entry.field.required },
  });
}

function onCanvasBackgroundClick() { builder.select([]); }
</script>

<template>
  <div class="pb-canvas-shell">
    <!-- ── Palette toolbar ── -->
    <div class="pb-palette">
      <div class="pb-palette__group">
        <span class="pb-palette__label">{{ t('coar.pageBuilder.palette.containers', undefined, 'Containers') }}</span>
        <button
          v-for="entry in visiblePalette.filter((e) => e.group === 'container')"
          :key="entry.type"
          type="button"
          class="pb-palette__card pb-palette__card--container"
          :class="{ 'pb-palette__card--dragging': isPaletteDragging(entry.type) }"
          :title="t('coar.pageBuilder.palette.dragToAdd', { label: entry.label }, 'Drag to add {label}')"
          @pointerdown="onCardPointerDown($event, entry.type)"
        >
          <CoarIcon :name="entry.icon" size="s" />
          <span>{{ entry.label }}</span>
        </button>
      </div>
      <div class="pb-palette__divider" />
      <div class="pb-palette__group">
        <span class="pb-palette__label">{{ t('coar.pageBuilder.palette.elements', undefined, 'Elements') }}</span>
        <button
          v-for="entry in visiblePalette.filter((e) => e.group === 'element')"
          :key="entry.type"
          type="button"
          class="pb-palette__card pb-palette__card--element"
          :class="{ 'pb-palette__card--dragging': isPaletteDragging(entry.type) }"
          :title="t('coar.pageBuilder.palette.dragToAdd', { label: entry.label }, 'Drag to add {label}')"
          @pointerdown="onCardPointerDown($event, entry.type)"
        >
          <CoarIcon :name="entry.icon" size="s" />
          <span>{{ entry.label }}</span>
        </button>
      </div>
      <template v-if="fieldPalette.length > 0">
        <div class="pb-palette__divider" />
        <div class="pb-palette__group">
          <span class="pb-palette__label">{{ t('coar.pageBuilder.palette.fields', undefined, 'Fields') }}</span>
          <button
            v-for="entry in fieldPalette"
            :key="entry.field.name"
            type="button"
            class="pb-palette__card pb-palette__card--field"
            :class="{ 'pb-palette__card--dragging': isFieldDragging(entry.field.name) }"
            :disabled="entry.bound || !entry.elementType"
            :title="
              entry.bound
                ? t('coar.pageBuilder.palette.fieldBound', undefined, 'Already on the page')
                : entry.elementType
                  ? t('coar.pageBuilder.palette.dragToAdd', { label: entry.label }, 'Drag to add {label}')
                  : t('coar.pageBuilder.palette.fieldNoElement', undefined, 'No compatible element available')
            "
            @pointerdown="onFieldPointerDown($event, entry)"
          >
            <CoarIcon :name="entry.icon" size="s" />
            <span>{{ entry.label }}</span>
            <span v-if="entry.field.required" class="pb-palette__field-required" aria-hidden="true">*</span>
          </button>
        </div>
      </template>
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
.pb-palette__card--field {
  --card-fg: #7c3aed;
  --card-fg-hover: #7c3aed;
  --card-border: rgba(124, 58, 237, 0.3);
  --card-border-hover: rgba(124, 58, 237, 0.55);
  --card-bg-hover: rgba(124, 58, 237, 0.08);
}

.pb-palette__card--field:disabled {
  opacity: 0.45;
  cursor: default;
  transform: none;
}

.pb-palette__field-required {
  color: var(--coar-text-semantic-error-bold, #c0392b);
  font-weight: 700;
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
