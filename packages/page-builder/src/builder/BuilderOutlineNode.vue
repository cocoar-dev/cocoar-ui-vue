<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, ref } from 'vue';
import { CoarIcon, type CoreIconName } from '@cocoar/vue-ui';
import { useI18n } from '@cocoar/vue-localization';
import { isElementAllowed, type PageNode } from '../schema';
import { resolveNodeRuntime } from '../runtimeBindings';
import { BUILDER_API, BUILDER_CONFIG, BUILDER_RUNTIME, BUILDER_VALIDATION } from './builderContext';
import { useMergedElements } from '../elements/useMergedElements';
import { useBuilderDnd } from './useBuilderDnd';
import type { NodePath } from './operations';

defineOptions({ name: 'BuilderOutlineNode' });

interface Props {
  node: PageNode;
  path: NodePath;
  depth?: number;
}

const props = withDefaults(defineProps<Props>(), { depth: 0 });

const { t } = useI18n();
const builder = inject(BUILDER_API)!;
const config = inject(BUILDER_CONFIG);
const runtime = inject(BUILDER_RUNTIME);
const validation = inject(BUILDER_VALIDATION);
const dnd = useBuilderDnd();
const elements = useMergedElements(config);
const authoredNode = computed(() => resolveNodeRuntime(props.node, runtime?.value ?? { config: config?.value }));

/** This node's registry definition (undefined for `page` and unknown types). */
const def = computed(() => elements.value[props.node.type]);

/**
 * Container-ness for the UI affordances (children, drop-into, add-child):
 * the page root plus every registered container definition.
 */
const isContainer = computed(
  () => props.node.type === 'page' || def.value?.container === true,
);

const children = computed<PageNode[]>(() => {
  const c = (props.node as PageNode & { children?: PageNode[] }).children;
  return Array.isArray(c) ? c : [];
});

const nodeIcon = computed<CoreIconName>(
  () => def.value?.builder?.icon ?? (props.node.type === 'page' ? 'file' : 'circle-alert'),
);

/**
 * Add-child menu from the merged registry (key order = menu order: built-ins
 * first, consumer registrations after); entries need a builder half and must
 * pass the allow-list.
 */
const visibleAddOptions = computed(() =>
  Object.entries(elements.value)
    .filter(([type, entry]) => entry.builder && isElementAllowed(type, config?.value))
    .map(([type, entry]) => ({
      type,
      label: t(entry.builder!.label.key, undefined, entry.builder!.label.fallback),
      icon: entry.builder!.icon ?? 'circle-alert',
      group: entry.builder!.group ?? 'element',
      hasValue: !!entry.value,
    })),
);

const containerAddOptions = computed(() =>
  visibleAddOptions.value.filter((o) => o.group === 'container'),
);
const inputAddOptions = computed(() =>
  visibleAddOptions.value.filter((o) => o.group === 'element' && o.hasValue),
);
const contentAddOptions = computed(() =>
  visibleAddOptions.value.filter((o) => o.group === 'element' && !o.hasValue),
);

/**
 * `hideElementPicker` (fields-only authoring) removes only the free INPUTS
 * offering — the value elements the field contract replaces. Containers and
 * content/action elements (headings, buttons, …) stay: every form needs
 * them, contract or not.
 */
const showFreeInputs = computed(() => config?.value?.hideElementPicker !== true);

/** Validation issues for *this* node — drives the warning icon in the row. */
const nodeIssues = computed(() => validation?.byNodeId.value.get(props.node.id) ?? []);
const issueSeverity = computed<'error' | 'warning' | null>(() => {
  if (nodeIssues.value.some((i) => i.severity === 'error')) return 'error';
  if (nodeIssues.value.length > 0) return 'warning';
  return null;
});
const issueTitle = computed(() =>
  nodeIssues.value.map((i) => `• ${i.message}`).join('\n'),
);

const isRoot = computed(() => props.path.length === 0);
const isSelected = computed(() => {
  const sel = builder.selectedPath.value;
  return sel !== null && sel.length === props.path.length && sel.every((v, i) => v === props.path[i]);
});

const nodeLabel = computed(() => {
  const n = authoredNode.value as PageNode & { props?: { text?: string; label?: string; title?: string } };
  if (n.type === 'page') {
    return t('coar.pageBuilder.type.page', undefined, 'Page');
  }
  if (n.type === 'stack') {
    return (n.props as { direction?: string } | undefined)?.direction === 'row'
      ? t('coar.pageBuilder.outline.row', undefined, 'Row')
      : t('coar.pageBuilder.outline.column', undefined, 'Column');
  }
  if (n.props?.text) return String(n.props.text);
  if (n.props?.label) return String(n.props.label);
  if (n.props?.title) return String(n.props.title);
  const label = def.value?.builder?.label;
  return label ? t(label.key, undefined, label.fallback) : n.type;
});

const nodeSubLabel = computed(() => {
  const n = props.node as PageNode & { name?: string };
  return n.name ? String(n.name) : undefined;
});

// ── Add-child dropdown ────────────────────────────────────────────────────────

const addMenuOpen = ref(false);
const addMenuRoot = ref<HTMLElement | null>(null);

function toggleAddMenu() { addMenuOpen.value = !addMenuOpen.value; }

function pickAdd(type: string) {
  addMenuOpen.value = false;
  builder.addChild(props.path, type);
}

function onDocClick(e: MouseEvent) {
  if (!addMenuOpen.value) return;
  const target = e.target as Node | null;
  if (target && addMenuRoot.value && !addMenuRoot.value.contains(target)) {
    addMenuOpen.value = false;
  }
}
function onDocKey(e: KeyboardEvent) {
  if (e.key === 'Escape') addMenuOpen.value = false;
}
onMounted(() => {
  document.addEventListener('click', onDocClick);
  document.addEventListener('keydown', onDocKey);
});
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick);
  document.removeEventListener('keydown', onDocKey);
});

// ── Drag & drop (outline surface of the shared pointer-drag context) ─────────

const pathKey = computed(() => props.path.join('/'));
const childCount = computed(() => children.value.length);

/** Zone keys are outline-prefixed so canvas zones with the same target never alias. */
function barKey(index: number): string { return `o:${pathKey.value}:${index}`; }
const intoKey = computed(() => `o:${pathKey.value}:into`);

function barClasses(index: number): Record<string, boolean> {
  const dragging = dnd.isDragging.value;
  return {
    'pb-outline-zone--active': dragging && dnd.canDrop(props.path),
    'pb-outline-zone--over': dnd.activeZoneKey.value === barKey(index),
  };
}

const isDropInto = computed(() =>
  dnd.isDragging.value && dnd.activeZoneKey.value === intoKey.value,
);

function onGripPointerDown(e: PointerEvent) {
  if (isRoot.value || builder.isPositionLocked(props.path)) return;
  const ghostFrom = (e.currentTarget as HTMLElement | null)?.closest<HTMLElement>('.pb-tree-row');
  dnd.onHandlePointerDown(e, { kind: 'move', path: [...props.path] }, ghostFrom);
}

// Enter/Space on the row itself selects — keys from the inline action buttons
// keep their native behavior.
function onRowKeydown(e: KeyboardEvent) {
  if ((e.target as HTMLElement | null)?.closest('button')) return;
  if (e.key !== 'Enter' && e.key !== ' ') return;
  e.preventDefault();
  builder.select(props.path);
}

// ── Move validation ───────────────────────────────────────────────────────────

function canMoveUp(): boolean {
  return props.path.length > 0 && props.path[props.path.length - 1] > 0;
}

function canMoveDown(): boolean {
  if (props.path.length === 0) return false;
  const parentPath = props.path.slice(0, -1);
  const idx = props.path[props.path.length - 1];
  let parent: PageNode = builder.schema.value;
  for (const p of parentPath) {
    const kids = (parent as PageNode & { children?: PageNode[] }).children;
    if (!Array.isArray(kids)) return false;
    parent = kids[p];
  }
  const siblings = (parent as PageNode & { children?: PageNode[] }).children;
  return Array.isArray(siblings) && idx < siblings.length - 1;
}
</script>

<template>
  <div
    class="pb-tree-node"
    :class="{ 'pb-tree-node--selected': isSelected, 'pb-tree-node--root': isRoot }"
  >
    <div
      class="pb-tree-row"
      :class="{ 'pb-tree-row--dropinto': isDropInto }"
      :style="{ paddingLeft: `${8 + depth * 16}px` }"
      role="treeitem"
      :aria-level="depth + 1"
      :aria-selected="isSelected"
      :aria-expanded="isContainer ? true : undefined"
      :tabindex="isSelected ? 0 : -1"
      :data-dropzone="isContainer ? intoKey : undefined"
      :data-pb-zone-path="isContainer ? pathKey : undefined"
      :data-pb-zone-index="isContainer ? childCount : undefined"
      @click.stop="builder.select(path)"
      @keydown="onRowKeydown"
    >
      <span
        v-if="!isRoot && !builder.isPositionLocked(path)"
        class="pb-tree-grip"
        aria-hidden="true"
        @pointerdown.stop="onGripPointerDown"
      >
        <CoarIcon name="grip-vertical" size="xs" />
      </span>
      <span v-else class="pb-tree-grip" aria-hidden="true" />
      <span class="pb-tree-type-icon" aria-hidden="true">
        <CoarIcon :name="nodeIcon" size="s" />
      </span>
      <span class="pb-tree-label">
        <span class="pb-tree-label-text">{{ nodeLabel }}</span>
        <span v-if="nodeSubLabel" class="pb-tree-label-key">{{ nodeSubLabel }}</span>
      </span>
      <span
        v-if="issueSeverity"
        class="pb-tree-issue"
        :class="`pb-tree-issue--${issueSeverity}`"
        :title="issueTitle"
        :aria-label="t('coar.pageBuilder.outline.validationIssues', undefined, 'Validation issues')"
      >
        <CoarIcon
          :name="issueSeverity === 'error' ? 'circle-alert' : 'triangle-alert'"
          size="s"
        />
      </span>
      <div class="pb-tree-actions">
        <button
          v-if="!isRoot"
          type="button"
          class="pb-tree-btn"
          :disabled="!canMoveUp() || builder.isPositionLocked(path)"
          :title="t('coar.pageBuilder.common.moveUp', undefined, 'Move up')"
          @click.stop="builder.move(path, -1)"
        >
          <CoarIcon name="chevron-up" size="s" />
        </button>
        <button
          v-if="!isRoot"
          type="button"
          class="pb-tree-btn"
          :disabled="!canMoveDown() || builder.isPositionLocked(path)"
          :title="t('coar.pageBuilder.common.moveDown', undefined, 'Move down')"
          @click.stop="builder.move(path, 1)"
        >
          <CoarIcon name="chevron-down" size="s" />
        </button>
        <button
          v-if="!isRoot"
          type="button"
          class="pb-tree-btn"
          :title="t('coar.pageBuilder.common.duplicate', undefined, 'Duplicate')"
          @click.stop="builder.duplicate(path)"
        >
          <CoarIcon name="copy" size="s" />
        </button>
        <button
          v-if="!isRoot && !builder.isRequired(path)"
          type="button"
          class="pb-tree-btn pb-tree-btn--danger"
          :title="t('coar.pageBuilder.common.delete', undefined, 'Delete')"
          @click.stop="builder.remove(path)"
        >
          <CoarIcon name="trash-2" size="s" />
        </button>
      </div>
    </div>

    <!-- Recursive children (with drop bars between the rows) -->
    <template v-if="isContainer">
      <template v-for="(child, i) in children" :key="child.id">
        <div
          class="pb-outline-zone"
          :class="barClasses(i)"
          :style="{ marginLeft: `${8 + (depth + 1) * 16}px` }"
          :data-dropzone="barKey(i)"
          :data-pb-zone-path="pathKey"
          :data-pb-zone-index="i"
          data-pb-zone-inflate="6"
          aria-hidden="true"
        />
        <BuilderOutlineNode
          :node="child"
          :path="[...path, i]"
          :depth="depth + 1"
        />
      </template>
      <div
        v-if="children.length > 0"
        class="pb-outline-zone"
        :class="barClasses(children.length)"
        :style="{ marginLeft: `${8 + (depth + 1) * 16}px` }"
        :data-dropzone="barKey(children.length)"
        :data-pb-zone-path="pathKey"
        :data-pb-zone-index="children.length"
        data-pb-zone-inflate="6"
        aria-hidden="true"
      />

      <!-- Add-child trigger + dropdown. With hideElementPicker (fields-only
           authoring) only the free INPUTS section disappears — containers and
           content/action elements stay: every form needs them. -->
      <div
        v-if="containerAddOptions.length > 0 || contentAddOptions.length > 0
          || (showFreeInputs && inputAddOptions.length > 0)"
        ref="addMenuRoot"
        class="pb-tree-add"
        :style="{ paddingLeft: `${8 + (depth + 1) * 16}px` }"
      >
        <button
          type="button"
          class="pb-tree-add__trigger"
          :class="{ 'pb-tree-add__trigger--open': addMenuOpen }"
          @click.stop="toggleAddMenu"
        >
          <CoarIcon name="plus" size="s" />
          <span>{{ t('coar.pageBuilder.outline.addChild', undefined, 'Add child') }}</span>
        </button>
        <div v-if="addMenuOpen" class="pb-tree-add__menu" role="menu">
          <template v-if="containerAddOptions.length > 0">
            <div class="pb-tree-add__group-label">{{ t('coar.pageBuilder.palette.containers', undefined, 'Containers') }}</div>
            <button
              v-for="opt in containerAddOptions"
              :key="opt.type"
              type="button"
              class="pb-tree-add__item"
              role="menuitem"
              @click.stop="pickAdd(opt.type)"
            >
              <CoarIcon :name="opt.icon" size="s" />
              <span>{{ opt.label }}</span>
            </button>
          </template>
          <template v-if="showFreeInputs && inputAddOptions.length > 0">
            <div v-if="containerAddOptions.length > 0" class="pb-tree-add__divider" />
            <div class="pb-tree-add__group-label">{{ t('coar.pageBuilder.palette.inputs', undefined, 'Inputs') }}</div>
            <button
              v-for="opt in inputAddOptions"
              :key="opt.type"
              type="button"
              class="pb-tree-add__item"
              role="menuitem"
              @click.stop="pickAdd(opt.type)"
            >
              <CoarIcon :name="opt.icon" size="s" />
              <span>{{ opt.label }}</span>
            </button>
          </template>
          <template v-if="contentAddOptions.length > 0">
            <div
              v-if="containerAddOptions.length > 0 || (showFreeInputs && inputAddOptions.length > 0)"
              class="pb-tree-add__divider"
            />
            <div class="pb-tree-add__group-label">{{ t('coar.pageBuilder.palette.elements', undefined, 'Elements') }}</div>
            <button
              v-for="opt in contentAddOptions"
              :key="opt.type"
              type="button"
              class="pb-tree-add__item"
              role="menuitem"
              @click.stop="pickAdd(opt.type)"
            >
              <CoarIcon :name="opt.icon" size="s" />
              <span>{{ opt.label }}</span>
            </button>
          </template>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.pb-tree-node {
  font-size: 13px;
  color: var(--coar-text-neutral-primary, #111);
}

.pb-tree-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-right: 8px;
  height: 30px;
  cursor: pointer;
  border-radius: 4px;
  position: relative;
}

.pb-tree-row:hover {
  background: var(--coar-surface-neutral-subtle, #f1f1f3);
}

.pb-tree-node--selected > .pb-tree-row {
  background: var(--coar-surface-accent-subtle, #e6eefa);
  color: var(--coar-text-accent, #1666cc);
}

.pb-tree-node--selected > .pb-tree-row::before {
  content: '';
  position: absolute;
  left: 0;
  top: 3px;
  bottom: 3px;
  width: 3px;
  border-radius: 2px;
  background: var(--coar-background-accent-primary, #1666cc);
}

.pb-tree-grip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 12px;
  color: var(--coar-icon-neutral-disabled, #b8b8bc);
  /* Faintly visible by default: touch has no hover to reveal the handle. */
  opacity: 0.4;
  transition: opacity 0.12s ease-out;
  flex-shrink: 0;
  cursor: grab;
  /* The pointer-drag engine owns the gesture on this handle. */
  touch-action: none;
}

.pb-tree-node--root > .pb-tree-row .pb-tree-grip {
  opacity: 0;
  cursor: default;
}

.pb-tree-row:hover .pb-tree-grip,
.pb-tree-node--selected > .pb-tree-row .pb-tree-grip {
  opacity: 1;
}

.pb-tree-node--root > .pb-tree-row:hover .pb-tree-grip {
  opacity: 0;
}

/* ── Drop targets while dragging ── */
.pb-outline-zone {
  height: 0;
  margin-right: 8px;
  border-radius: 2px;
  transition: height 0.12s ease-out, background-color 0.12s ease-out;
  background: transparent;
  pointer-events: none;
}

.pb-outline-zone--active {
  height: 6px;
  background: rgba(22, 102, 204, 0.15);
  outline: 1px dashed rgba(22, 102, 204, 0.35);
  outline-offset: -1px;
}

.pb-outline-zone--over {
  height: 10px;
  background: var(--coar-background-accent-primary, #1666cc);
  outline: none;
}

.pb-tree-row--dropinto {
  background: var(--coar-surface-accent-subtle, #e6eefa);
  box-shadow: inset 0 0 0 2px var(--coar-border-accent, #1666cc);
}

.pb-tree-type-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--coar-icon-neutral-secondary, #5a5a60);
  flex-shrink: 0;
}

.pb-tree-node--selected > .pb-tree-row .pb-tree-type-icon {
  color: var(--coar-icon-accent, #1666cc);
}

.pb-tree-label {
  flex: 1;
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
}

.pb-tree-label-text {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pb-tree-label-key {
  font-size: 11px;
  font-family: ui-monospace, Menlo, Consolas, monospace;
  color: var(--coar-text-neutral-tertiary, #8a8a90);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pb-tree-node--selected > .pb-tree-row .pb-tree-label-key {
  color: var(--coar-text-accent, #1666cc);
  opacity: 0.7;
}

.pb-tree-issue {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  margin-right: 30px; /* leave space for the hover-action overlay */
  flex-shrink: 0;
}

.pb-tree-issue--warning {
  color: var(--coar-icon-semantic-warning, #b45309);
}

.pb-tree-issue--error {
  color: var(--coar-icon-semantic-error, #c0392b);
}

.pb-tree-actions {
  display: flex;
  gap: 1px;
  opacity: 0;
  transition: opacity 0.12s ease-out;
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  background: var(--coar-surface-neutral-subtle, #f1f1f3);
  border-radius: 4px;
  padding: 1px;
}

.pb-tree-row:hover .pb-tree-actions,
.pb-tree-node--selected > .pb-tree-row .pb-tree-actions {
  opacity: 1;
}

.pb-tree-node--selected > .pb-tree-row .pb-tree-actions {
  background: var(--coar-surface-accent-subtle, #e6eefa);
}

.pb-tree-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--coar-icon-neutral-secondary, #5a5a60);
  cursor: pointer;
  border-radius: 3px;
  transition: background-color 0.12s ease-out, color 0.12s ease-out;
}

.pb-tree-btn:hover:not(:disabled) {
  background: var(--coar-surface-neutral-default, #dedee2);
  color: var(--coar-icon-neutral-primary, #111);
}

.pb-tree-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.pb-tree-btn--danger:hover:not(:disabled) {
  background: var(--coar-surface-semantic-error-subtle, #fde8e4);
  color: var(--coar-text-semantic-error-bold, #c0392b);
}

/* ── Add child ── */
.pb-tree-add {
  position: relative;
  padding-right: 8px;
  padding-top: 2px;
  padding-bottom: 2px;
}

.pb-tree-add__trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 26px;
  padding: 0 10px;
  border: 1px dashed var(--coar-border-neutral, #cecece);
  background: transparent;
  color: var(--coar-text-neutral-secondary, #666);
  font-family: inherit;
  font-size: 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: border-color 0.12s, color 0.12s, background-color 0.12s;
}

.pb-tree-add__trigger:hover,
.pb-tree-add__trigger--open {
  border-color: var(--coar-border-accent, #1666cc);
  color: var(--coar-text-accent, #1666cc);
  background: var(--coar-surface-accent-subtle, #e6eefa);
}

.pb-tree-add__menu {
  position: absolute;
  top: calc(100% + 4px);
  left: inherit;
  padding: 4px;
  min-width: 200px;
  background: var(--coar-surface-default, #fff);
  border: 1px solid var(--coar-border-neutral, #dcdce0);
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  z-index: 10;
  display: flex;
  flex-direction: column;
}

.pb-tree-add__group-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--coar-text-neutral-tertiary, #8a8a90);
  padding: 6px 8px 2px;
}

.pb-tree-add__divider {
  height: 1px;
  background: var(--coar-border-neutral-subtle, #eeeef0);
  margin: 4px 0;
}

.pb-tree-add__item {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border: none;
  background: transparent;
  color: var(--coar-text-neutral-primary, #111);
  font-family: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.12s;
}

.pb-tree-add__item:hover {
  background: var(--coar-surface-accent-subtle, #e6eefa);
  color: var(--coar-text-accent, #1666cc);
}

.pb-tree-add__item > :first-child {
  color: var(--coar-icon-neutral-secondary, #5a5a60);
  flex-shrink: 0;
}

.pb-tree-add__item:hover > :first-child {
  color: var(--coar-icon-accent, #1666cc);
}
</style>
