<script setup lang="ts">
import { computed, inject, reactive, ref } from 'vue';
import { CoarIcon, CoarTextInput, type CoreIconName } from '@cocoar/vue-ui';
import { useI18n } from '@cocoar/vue-localization';
import { BUILDER_API, BUILDER_COMPOSITIONS, BUILDER_CONFIG } from './builderContext';
import { useBuilderDnd } from './useBuilderDnd';
import { useMergedElements } from '../elements/useMergedElements';
import { defaultElementForField } from '../elements/fieldContract';
import { isElementAllowed, type PageFieldSpec, type PageNode } from '../schema';

defineOptions({ name: 'BuilderPalette' });

const builder = inject(BUILDER_API)!;
const config = inject(BUILDER_CONFIG);
const compositions = inject(BUILDER_COMPOSITIONS);
const dnd = useBuilderDnd();
const elements = useMergedElements(config);
const { t } = useI18n();
const query = ref('');
const collapsed = reactive<Record<'containers' | 'elements' | 'compositions' | 'fields', boolean>>({
  containers: false,
  elements: false,
  compositions: false,
  fields: false,
});

interface PaletteEntry {
  type: string;
  label: string;
  icon: CoreIconName;
  group: 'container' | 'element';
  hasValue: boolean;
}

const normalizedQuery = computed(() => query.value.trim().toLocaleLowerCase());
function matches(...values: Array<string | undefined>): boolean {
  const needle = normalizedQuery.value;
  return !needle || values.some((value) => value?.toLocaleLowerCase().includes(needle));
}

const visiblePalette = computed<PaletteEntry[]>(() =>
  Object.entries(elements.value)
    .filter(([type, def]) => def.builder && isElementAllowed(type, config?.value))
    .map(([type, def]) => ({
      type,
      label: t(def.builder!.label.key, undefined, def.builder!.label.fallback),
      icon: def.builder!.icon ?? 'circle-alert',
      group: def.builder!.group ?? 'element',
      hasValue: !!def.value,
    })),
);

const containerEntries = computed(() => visiblePalette.value
  .filter((entry) => entry.group === 'container' && matches(entry.label, entry.type)));
const elementEntries = computed(() => visiblePalette.value
  .filter((entry) => entry.group === 'element'
    && (config?.value?.hideElementPicker !== true || !entry.hasValue)
    && matches(entry.label, entry.type)));
const compositionEntries = computed(() => (compositions?.summaries.value ?? [])
  .filter((entry) => matches(entry.name, entry.id, entry.latestVersion)));

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
  elementType?: string;
  bound: boolean;
  icon: CoreIconName;
  label: string;
}

const boundNames = computed(() => {
  const names = new Set<string>();
  const walk = (node: PageNode) => {
    const name = (node as { name?: string }).name;
    if (name) names.add(name);
    if ('children' in node && Array.isArray(node.children)) node.children.forEach(walk);
  };
  walk(builder.schema.value);
  return names;
});

const fieldEntries = computed<FieldPaletteEntry[]>(() =>
  (config?.value?.fields ?? [])
    .map((field) => ({
      field,
      elementType: defaultElementForField(elements.value, field, config?.value),
      bound: boundNames.value.has(field.name),
      icon: FIELD_TYPE_ICONS[field.valueType] ?? 'circle-alert',
      label: field.label ?? field.name,
    }))
    .filter((entry) => matches(entry.label, entry.field.name, entry.field.valueType)),
);

function isPaletteDragging(type: string): boolean {
  const payload = dnd.payload.value;
  return !!(payload && payload.kind === 'new' && !payload.bind && payload.type === type);
}

function onCardPointerDown(event: PointerEvent, type: string) {
  dnd.onHandlePointerDown(event, { kind: 'new', type });
}

function isCompositionDragging(id: string, version: string): boolean {
  const payload = dnd.payload.value;
  return !!(payload && payload.kind === 'composition' && payload.id === id && payload.version === version);
}

function onCompositionPointerDown(event: PointerEvent, id: string, version: string) {
  dnd.onHandlePointerDown(event, { kind: 'composition', id, version });
}

function isFieldDragging(name: string): boolean {
  const payload = dnd.payload.value;
  return !!(payload && payload.kind === 'new' && payload.bind?.name === name);
}

function onFieldPointerDown(event: PointerEvent, entry: FieldPaletteEntry) {
  if (entry.bound || !entry.elementType) return;
  dnd.onHandlePointerDown(event, {
    kind: 'new',
    type: entry.elementType,
    bind: {
      name: entry.field.name,
      label: entry.field.label,
      required: entry.field.required,
    },
  });
}
</script>

<template>
  <aside class="pb-library" aria-label="Element library">
    <div class="pb-library__search">
      <label class="pb-library__sr-only" for="pb-library-search">Search elements</label>
      <CoarTextInput
        id="pb-library-search"
        v-model="query"
        size="s"
        type="search"
        autocomplete="off"
        placeholder="Search elements…"
      />
    </div>

    <div class="pb-library__scroll">
      <section v-if="config?.fields?.length" class="pb-library__group" data-palette-group="fields">
        <button type="button" class="pb-library__group-toggle" :aria-expanded="!collapsed.fields" @click="collapsed.fields = !collapsed.fields">
          <CoarIcon :name="collapsed.fields ? 'chevron-right' : 'chevron-down'" size="xs" />
          <span>{{ t('coar.pageBuilder.palette.fields', undefined, 'Fields') }}</span>
          <small>{{ fieldEntries.length }}</small>
        </button>
        <div v-if="!collapsed.fields" class="pb-library__items">
          <button
            v-for="entry in fieldEntries"
            :key="entry.field.name"
            type="button"
            class="pb-library__item pb-library__item--field"
            :class="{ 'pb-library__item--dragging': isFieldDragging(entry.field.name) }"
            :disabled="entry.bound || !entry.elementType"
            :title="entry.bound
              ? t('coar.pageBuilder.palette.fieldBound', undefined, 'Already on the page')
              : entry.elementType
                ? t('coar.pageBuilder.palette.dragToAdd', { label: entry.label }, 'Drag to add {label}')
                : t('coar.pageBuilder.palette.fieldNoElement', undefined, 'No compatible element available')"
            @pointerdown="onFieldPointerDown($event, entry)"
          >
            <CoarIcon :name="entry.icon" size="s" />
            <span>{{ entry.label }}</span>
            <span v-if="entry.field.required" class="pb-library__required" aria-hidden="true">*</span>
          </button>
          <p v-if="fieldEntries.length === 0" class="pb-library__empty">No matching fields</p>
        </div>
      </section>

      <section class="pb-library__group" data-palette-group="containers">
        <button type="button" class="pb-library__group-toggle" :aria-expanded="!collapsed.containers" @click="collapsed.containers = !collapsed.containers">
          <CoarIcon :name="collapsed.containers ? 'chevron-right' : 'chevron-down'" size="xs" />
          <span>{{ t('coar.pageBuilder.palette.containers', undefined, 'Containers') }}</span>
          <small>{{ containerEntries.length }}</small>
        </button>
        <div v-if="!collapsed.containers" class="pb-library__items">
          <button
            v-for="entry in containerEntries"
            :key="entry.type"
            type="button"
            class="pb-library__item pb-library__item--container"
            :class="{ 'pb-library__item--dragging': isPaletteDragging(entry.type) }"
            :title="t('coar.pageBuilder.palette.dragToAdd', { label: entry.label }, 'Drag to add {label}')"
            @pointerdown="onCardPointerDown($event, entry.type)"
          >
            <CoarIcon :name="entry.icon" size="s" />
            <span>{{ entry.label }}</span>
          </button>
          <p v-if="containerEntries.length === 0" class="pb-library__empty">No matching containers</p>
        </div>
      </section>

      <section class="pb-library__group" data-palette-group="elements">
        <button type="button" class="pb-library__group-toggle" :aria-expanded="!collapsed.elements" @click="collapsed.elements = !collapsed.elements">
          <CoarIcon :name="collapsed.elements ? 'chevron-right' : 'chevron-down'" size="xs" />
          <span>{{ t('coar.pageBuilder.palette.elements', undefined, 'Elements') }}</span>
          <small>{{ elementEntries.length }}</small>
        </button>
        <div v-if="!collapsed.elements" class="pb-library__items">
          <button
            v-for="entry in elementEntries"
            :key="entry.type"
            type="button"
            class="pb-library__item pb-library__item--element"
            :class="{ 'pb-library__item--dragging': isPaletteDragging(entry.type) }"
            :title="t('coar.pageBuilder.palette.dragToAdd', { label: entry.label }, 'Drag to add {label}')"
            @pointerdown="onCardPointerDown($event, entry.type)"
          >
            <CoarIcon :name="entry.icon" size="s" />
            <span>{{ entry.label }}</span>
          </button>
          <p v-if="elementEntries.length === 0" class="pb-library__empty">No matching elements</p>
        </div>
      </section>

      <section v-if="compositions?.enabled.value" class="pb-library__group" data-palette-group="compositions" data-testid="composition-palette">
        <button type="button" class="pb-library__group-toggle" :aria-expanded="!collapsed.compositions" @click="collapsed.compositions = !collapsed.compositions">
          <CoarIcon :name="collapsed.compositions ? 'chevron-right' : 'chevron-down'" size="xs" />
          <span>{{ t('coar.pageBuilder.palette.compositions', undefined, 'Compositions') }}</span>
          <small>{{ compositionEntries.length }}</small>
        </button>
        <div v-if="!collapsed.compositions" class="pb-library__items">
          <button
            v-for="entry in compositionEntries"
            :key="entry.id"
            type="button"
            class="pb-library__item pb-library__item--composition"
            :class="{ 'pb-library__item--dragging': isCompositionDragging(entry.id, entry.latestVersion) }"
            :title="`${t('coar.pageBuilder.palette.dragToAdd', { label: entry.name }, 'Drag to add {label}')} · ${entry.latestVersion}`"
            :data-composition-id="entry.id"
            @pointerdown="onCompositionPointerDown($event, entry.id, entry.latestVersion)"
          >
            <CoarIcon name="copy" size="s" />
            <span>{{ entry.name }}</span>
            <small>{{ entry.latestVersion }}</small>
          </button>
          <p v-if="compositionEntries.length === 0" class="pb-library__empty">No matching compositions</p>
        </div>
      </section>

    </div>
  </aside>
</template>

<style scoped>
.pb-library { display: flex; flex: 1; min-height: 0; flex-direction: column; overflow: hidden; background: var(--coar-background-neutral-primary, #fff); }
.pb-library__sr-only { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
.pb-library__search { flex: 0 0 auto; padding: 10px 9px; border-bottom: 1px solid var(--coar-border-neutral-tertiary, #ececef); }
.pb-library__scroll { flex: 1; min-height: 0; overflow: auto; }
.pb-library__group { border-bottom: 1px solid var(--coar-border-neutral-tertiary, #ececef); }
.pb-library__group-toggle { display: grid; grid-template-columns: 16px minmax(0, 1fr) auto; align-items: center; gap: 6px; width: 100%; height: 36px; padding: 0 10px; border: 0; background: transparent; color: var(--coar-text-neutral-secondary, #5f6368); font: inherit; font-size: 12px; font-weight: 500; letter-spacing: .01em; text-align: left; cursor: pointer; }
.pb-library__group-toggle:hover { background: var(--coar-background-neutral-secondary, #f6f6f7); }
.pb-library__group-toggle small { min-width: 18px; padding: 0; color: var(--coar-text-neutral-tertiary, #8b8f96); font-size: 10px; font-weight: 400; text-align: right; }
.pb-library__items { display: grid; gap: 2px; padding: 3px 6px 8px; }
.pb-library__item { --item-accent: #6c7078; display: grid; grid-template-columns: 18px minmax(0, 1fr) auto; align-items: center; gap: 7px; min-height: 30px; padding: 4px 7px; border: 1px solid transparent; border-radius: 4px; background: transparent; color: var(--coar-text-neutral-primary, #303238); font: inherit; font-size: 12px; font-weight: 400; text-align: left; cursor: grab; user-select: none; touch-action: none; }
.pb-library__item:hover { border-color: var(--coar-border-neutral-tertiary, #e4e5e8); background: var(--coar-background-neutral-secondary, #f5f5f6); }
.pb-library__item > span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pb-library__item > :first-child { color: var(--item-accent); }
.pb-library__item > small { color: var(--coar-text-neutral-tertiary, #8b8f96); font-size: 9px; }
.pb-library__item--container { --item-accent: #52749a; }
.pb-library__item--element { --item-accent: #5f6b72; }
.pb-library__item--composition { --item-accent: #806b52; }
.pb-library__item--field { --item-accent: #725f88; }
.pb-library__item--dragging { opacity: .4; cursor: grabbing; }
.pb-library__item:disabled { opacity: .43; cursor: default; }
.pb-library__required { color: var(--coar-text-semantic-error-bold, #b42318); font-weight: 500; }
.pb-library__empty { margin: 4px 3px; color: var(--coar-text-neutral-tertiary, #777); font-size: 11px; }
</style>
