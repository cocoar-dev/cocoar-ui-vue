<script setup lang="ts">
/**
 * Dual-mode editor for a token that normally aliases a scale (radius, spacing,
 * shadow, …):
 *
 *   - **Scale**  — pick one of the valid parent tokens (derived live from the
 *     CSSOM via the naming schema, e.g. all `--coar-radius-*`). Emits
 *     `var(--coar-radius-m)`.
 *   - **Fixed**  — override with a concrete value (`12px`, `1.4rem`). Emits the
 *     raw string.
 *
 * The bound value is the full CSS value string, so the theme-editor state can
 * write it to the token as-is — works on any layer (primitive, semantic,
 * component).
 */
import { computed, ref, watch } from 'vue';
import CoarSegmentedControl from '../segmented-control/CoarSegmentedControl.vue';
import CoarSelect from '../select/CoarSelect.vue';
import CoarTextInput from '../text-input/CoarTextInput.vue';
import { listScaleTokens } from './internal/scale-tokens';

const props = defineProps<{
  /** Full CSS value, e.g. `var(--coar-radius-xs)` or `12px`. */
  modelValue: string;
  /** Scale category for the parent options, e.g. `radius`. */
  category: string;
}>();
const emit = defineEmits<{ 'update:modelValue': [string] }>();

const options = computed(() =>
  listScaleTokens(props.category).map((t) => ({ value: t.value, label: t.label })),
);

const isRef = (v: string) => /^var\(/.test((v ?? '').trim());
const mode = ref<'scale' | 'custom'>(isRef(props.modelValue) ? 'scale' : 'custom');

// External replacement (preset / reset) re-derives the mode.
watch(() => props.modelValue, (v) => { mode.value = isRef(v) ? 'scale' : 'custom'; });

const MODE_OPTIONS = [
  { value: 'scale', label: 'Scale' },
  { value: 'custom', label: 'Fixed' },
];

/** Resolve `var(--coar-x)` to its concrete computed value (for seeding Fixed). */
function resolveRef(v: string): string {
  const m = /var\((--coar-[a-z0-9-]+)\)/.exec(v);
  if (m && typeof document !== 'undefined') {
    const px = getComputedStyle(document.documentElement).getPropertyValue(m[1]).trim();
    if (px) return px;
  }
  return v;
}

function setMode(m: 'scale' | 'custom') {
  mode.value = m;
  // Leaving Scale → seed Fixed with the resolved concrete value (no "var(…)"
  // showing up in the text field).
  if (m === 'custom' && isRef(props.modelValue)) emit('update:modelValue', resolveRef(props.modelValue));
}
</script>

<template>
  <div class="tse">
    <CoarSegmentedControl
      :model-value="mode"
      :options="MODE_OPTIONS"
      size="xs"
      @update:model-value="setMode($event as 'scale' | 'custom')"
    />
    <CoarSelect
      v-if="mode === 'scale'"
      :model-value="modelValue"
      :options="options"
      size="s"
      placeholder="Pick a scale step"
      @update:model-value="emit('update:modelValue', $event as string)"
    />
    <CoarTextInput
      v-else
      :model-value="modelValue"
      placeholder="e.g. 12px or 1.4rem"
      size="s"
      @update:model-value="emit('update:modelValue', $event)"
    />
  </div>
</template>

<style scoped>
.tse {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
</style>
