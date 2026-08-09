<script setup lang="ts">
import { computed, ref } from 'vue';
import { CoarIcon, CoarTextInput } from '@cocoar/vue-ui';
import { useI18n } from '@cocoar/vue-localization';
import type { PageElementQuickCompound, PageElementQuickCompoundPart } from '../../elements/registry';
import { formatBoxSides, parseBoxSides, type BoxSide, type BoxSides } from '../boxSides';

/**
 * Several related lengths on one row: the value people actually reach for stays
 * directly editable, the rarer ones fold out underneath. Backed either by one
 * property per part (height + min/max) or by a single CSS shorthand split into
 * sides (padding).
 */
const props = defineProps<{
  compound: PageElementQuickCompound;
  readPath: (path: string) => string;
  readShorthand: () => string;
  writePath: (path: string, value: string) => void;
  writeShorthand: (value: string | undefined) => void;
  /** True when the document already carries an assignment for this compound. */
  assigned: boolean;
  onReset: () => void;
}>();

const { t } = useI18n();
const expanded = ref(false);

// Real <label for> rather than aria-label: it also makes the visible text a
// click target for the control, which a span cannot do.
const fieldId = `pb-compound-${Math.random().toString(36).slice(2, 9)}`;
const primaryId = `${fieldId}-primary`;
const detailId = (key: string) => `${fieldId}-${key}`;

const label = computed(() => t(props.compound.label.key, undefined, props.compound.label.fallback));
function partLabel(part: PageElementQuickCompoundPart) {
  return t(part.label.key, undefined, part.label.fallback);
}

const isSides = computed(() => !!props.compound.shorthand);

/**
 * A shorthand the parser cannot split (a `calc()` with spaces) has to stay
 * editable as a whole rather than be silently rewritten.
 */
const sides = computed<BoxSides | null>(() =>
  isSides.value ? parseBoxSides(props.readShorthand()) : null,
);
const unsplittable = computed(() => isSides.value && sides.value === null);

/** For paths: the part without a summary prefix is the headline value. */
const primaryPart = computed(() => props.compound.parts.find((p) => !p.summaryPrefix));
const detailParts = computed(() =>
  isSides.value ? props.compound.parts : props.compound.parts.filter((p) => p.summaryPrefix),
);

const primaryValue = computed(() => {
  if (isSides.value) return props.readShorthand();
  const path = primaryPart.value?.path;
  return path ? props.readPath(path) : '';
});

function setPrimary(value: string) {
  if (isSides.value) {
    props.writeShorthand(value.trim() === '' ? undefined : value);
    return;
  }
  const path = primaryPart.value?.path;
  if (path) props.writePath(path, value);
}

function detailValue(part: PageElementQuickCompoundPart): string {
  if (isSides.value) return sides.value ? sides.value[part.key as BoxSide] ?? '' : '';
  return part.path ? props.readPath(part.path) : '';
}

function setDetail(part: PageElementQuickCompoundPart, value: string) {
  if (isSides.value) {
    const current = sides.value;
    if (!current) return;
    props.writeShorthand(formatBoxSides({ ...current, [part.key as BoxSide]: value }));
    return;
  }
  if (part.path) props.writePath(part.path, value);
}

/** Marks the toggle when folded-away values are set, so they are not invisible. */
const detailSummary = computed(() => {
  if (isSides.value) {
    const current = sides.value;
    if (!current) return '';
    const distinct = new Set([current.top, current.right, current.bottom, current.left]);
    return distinct.size > 1 ? 'per side' : '';
  }
  const pieces: string[] = [];
  for (const part of detailParts.value) {
    const value = detailValue(part).trim();
    if (value) pieces.push(`${part.summaryPrefix} ${value}`);
  }
  return pieces.join(' · ');
});

const primaryPlaceholder = computed(() =>
  isSides.value ? 'all sides' : primaryPart.value?.placeholder,
);
</script>

<template>
  <div class="pb-compound">
    <div class="pb-compound__row">
      <label class="pb-compound__label" :for="primaryId">{{ label }}</label>

      <CoarTextInput
        :id="primaryId"
        size="xs"
        class="pb-compound__input"
        :model-value="primaryValue"
        :placeholder="primaryPlaceholder"
        @update:model-value="setPrimary"
      />

      <button
        type="button"
        class="pb-compound__toggle"
        :class="{ 'pb-compound__toggle--marked': !!detailSummary }"
        :aria-expanded="expanded"
        :title="expanded ? `Hide ${label} details` : `Show ${label} details`"
        @click="expanded = !expanded"
      >
        <CoarIcon :name="expanded ? 'chevron-up' : 'chevron-down'" size="xs" />
      </button>
    </div>

    <p v-if="detailSummary && !expanded" class="pb-compound__hint">{{ detailSummary }}</p>

    <div v-if="expanded" class="pb-compound__details">
      <p v-if="unsplittable" class="pb-compound__note">
        This value cannot be split into sides — edit it above as a whole.
      </p>
      <template v-else>
        <div v-for="part in detailParts" :key="part.key" class="pb-compound__detail">
          <label class="pb-compound__detail-label" :for="detailId(part.key)">{{ partLabel(part) }}</label>
          <CoarTextInput
            :id="detailId(part.key)"
            size="xs"
            :placeholder="part.placeholder"
            :model-value="detailValue(part)"
            @update:model-value="(v: string) => setDetail(part, v)"
          />
        </div>
      </template>
      <button v-if="assigned" type="button" class="pb-compound__reset" @click="onReset">
        Reset {{ label.toLowerCase() }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.pb-compound {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.pb-compound__row {
  display: grid;
  grid-template-columns: minmax(0, 84px) minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
}

.pb-compound__label {
  font-size: 12px;
  line-height: 1.3;
  color: var(--coar-text-neutral-secondary, #5a5a60);
  overflow-wrap: anywhere;
}

.pb-compound__input { min-width: 0; }

.pb-compound__toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--coar-icon-neutral-secondary, #6c7078);
  cursor: pointer;
  position: relative;
}

.pb-compound__toggle:hover {
  background: var(--coar-background-neutral-tertiary, #eeeef1);
  color: var(--coar-icon-neutral-primary, #202124);
}

/* A dot rather than a number: it only has to say "there is more here". */
.pb-compound__toggle--marked::after {
  content: '';
  position: absolute;
  top: 2px;
  right: 2px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--coar-background-accent-primary, #315f91);
}

.pb-compound__hint {
  margin: 0 0 0 92px;
  font-size: 11px;
  color: var(--coar-text-neutral-tertiary, #8a8a90);
}

.pb-compound__details {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 2px 0 4px 92px;
  padding-left: 8px;
  border-left: 1px solid var(--coar-border-neutral, #e2e2e6);
}

.pb-compound__detail {
  display: grid;
  grid-template-columns: minmax(0, 64px) minmax(0, 1fr);
  align-items: center;
  gap: 8px;
}

.pb-compound__detail-label {
  font-size: 11px;
  color: var(--coar-text-neutral-tertiary, #8a8a90);
  overflow-wrap: anywhere;
}

.pb-compound__note {
  margin: 0;
  font-size: 11px;
  color: var(--coar-text-neutral-secondary, #5a5a60);
}

.pb-compound__reset {
  align-self: flex-start;
  border: 0;
  background: transparent;
  padding: 2px 0;
  font: inherit;
  font-size: 11px;
  color: var(--coar-text-accent-primary, #315f91);
  cursor: pointer;
}
</style>
