<script setup lang="ts">
import { computed } from 'vue';
import { CoarFormField, CoarIcon, CoarPopover, CoarTextInput } from '@cocoar/vue-ui';
import { useI18n } from '@cocoar/vue-localization';
import type { PageElementQuickCompound, PageElementQuickCompoundPart } from '../../elements/registry';
import { formatBoxSides, parseBoxSides, type BoxSide, type BoxSides } from '../boxSides';

/**
 * Renders several related lengths as one row: a readable summary plus a popover
 * with the individual inputs. Backed either by one property per part
 * (min/height/max) or by a single CSS shorthand split into sides (padding).
 */
const props = defineProps<{
  compound: PageElementQuickCompound;
  /** Current value of a part's own property. */
  readPath: (path: string) => string;
  /** Current value of the shorthand property. */
  readShorthand: () => string;
  writePath: (path: string, value: string) => void;
  writeShorthand: (value: string | undefined) => void;
  /** True when the document already carries an assignment for this compound. */
  assigned: boolean;
  onReset: () => void;
}>();

const { t } = useI18n();

const label = computed(() => t(props.compound.label.key, undefined, props.compound.label.fallback));
function partLabel(part: PageElementQuickCompoundPart) {
  return t(part.label.key, undefined, part.label.fallback);
}

const isSides = computed(() => !!props.compound.shorthand);

/**
 * A shorthand the parser could not split (a `calc()` with spaces, say) must
 * stay editable as a whole rather than being silently rewritten.
 */
const sides = computed<BoxSides | null>(() =>
  isSides.value ? parseBoxSides(props.readShorthand()) : null,
);
const unsplittable = computed(() => isSides.value && sides.value === null);

function sideValue(key: string): string {
  return sides.value ? sides.value[key as BoxSide] ?? '' : '';
}

function setSide(key: string, value: string) {
  const current = sides.value;
  if (!current) return;
  props.writeShorthand(formatBoxSides({ ...current, [key as BoxSide]: value }));
}

/** Collapsed line, e.g. 'min 50px / 120px' or '16px 32px'. Empty stays 'auto'. */
const summary = computed(() => {
  if (isSides.value) {
    const raw = props.readShorthand().trim();
    if (unsplittable.value) return raw;
    const shorthand = sides.value ? formatBoxSides(sides.value) : undefined;
    return shorthand ?? '';
  }
  const pieces: string[] = [];
  for (const part of props.compound.parts) {
    if (!part.path) continue;
    const value = props.readPath(part.path).trim();
    if (!value) continue;
    pieces.push(part.summaryPrefix ? `${part.summaryPrefix} ${value}` : value);
  }
  return pieces.join(' / ');
});
</script>

<template>
  <div class="pb-compound">
    <span class="pb-compound__label">{{ label }}</span>

    <CoarPopover mode="click" :offset="8">
      <template #default>
        <button type="button" class="pb-compound__summary" :title="label">
          <!-- Neutral dash rather than 'auto': the initial value differs per
               property (auto for height, none for padding), and guessing wrong
               reads as a set value. -->
          <span :class="['pb-compound__value', { 'pb-compound__value--empty': !summary }]">
            {{ summary || '—' }}
          </span>
          <CoarIcon name="ellipsis" size="xs" />
        </button>
      </template>

      <template #content>
        <div class="pb-compound__panel">
          <p v-if="unsplittable" class="pb-compound__note">
            This value cannot be split into sides. Edit it as a whole.
          </p>
          <CoarFormField v-if="unsplittable" label="Value">
            <CoarTextInput
              size="s"
              :model-value="props.readShorthand()"
              @update:model-value="(v: string) => props.writeShorthand(v || undefined)"
            />
          </CoarFormField>

          <template v-else>
            <CoarFormField
              v-for="part in compound.parts"
              :key="part.key"
              :label="partLabel(part)"
            >
              <CoarTextInput
                size="s"
                :placeholder="part.placeholder"
                :model-value="isSides ? sideValue(part.key) : props.readPath(part.path!)"
                @update:model-value="(v: string) => isSides ? setSide(part.key, v) : props.writePath(part.path!, v)"
              />
            </CoarFormField>
          </template>
        </div>
      </template>
    </CoarPopover>

    <button
      v-if="assigned"
      type="button"
      class="pb-compound__reset"
      :title="`Remove ${label} assignment`"
      @click="onReset"
    >Reset</button>
  </div>
</template>

<style scoped>
.pb-compound {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.pb-compound__label {
  font-size: 12px;
  color: var(--coar-text-neutral-secondary, #5a5a60);
  flex-shrink: 0;
}

.pb-compound__summary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: 1 1 auto;
  min-width: 0;
  padding: 3px 6px;
  border: 1px solid var(--coar-border-neutral, #e2e2e6);
  border-radius: 4px;
  background: var(--coar-background-neutral-primary, #fff);
  color: var(--coar-text-neutral-primary, #202124);
  font: inherit;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
}

.pb-compound__summary:hover {
  border-color: var(--coar-border-neutral-strong, #c9c9cf);
}

.pb-compound__value {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pb-compound__value--empty {
  color: var(--coar-text-neutral-tertiary, #8a8a90);
}

.pb-compound__panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 180px;
  padding: 4px;
}

.pb-compound__note {
  margin: 0;
  font-size: 11px;
  color: var(--coar-text-neutral-secondary, #5a5a60);
}

.pb-compound__reset {
  border: 0;
  background: transparent;
  padding: 0;
  font: inherit;
  font-size: 11px;
  color: var(--coar-text-accent-primary, #315f91);
  cursor: pointer;
  flex-shrink: 0;
}
</style>
