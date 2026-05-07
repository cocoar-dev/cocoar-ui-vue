<script setup lang="ts">
/**
 * `<CoarDisplayZoneSwitcher>` — drop-in display-zone selector.
 *
 * The calendar engine already supports a reactive display zone via
 * `builder.timezone(ref)` (Article 4 / invariant C5: display zone is
 * separate from each event's source zone, switching the display zone
 * never destroys event intent). This component is the matching UI:
 * a `CoarSelect` populated with a curated short-list of common zones
 * plus the browser-detected zone, that writes back to a string `ref`.
 *
 * Usage (illustrative — see the docs page for a runnable example):
 *
 *   const tz = ref(Intl.DateTimeFormat().resolvedOptions().timeZone);
 *   const { builder } = useCalendar();
 *   builder.timezone(tz); // engine reacts to tz.value changes
 *
 *   <CoarDisplayZoneSwitcher v-model="tz" />
 *   <CoarCalendar :builder="builder" />
 *
 * Override the curated list via the `:options` prop if you need a
 * domain-specific roster (or `Intl.supportedValuesOf('timeZone')` to
 * get the full ~ 400-entry IANA list).
 */
import { computed } from 'vue';
import { CoarSelect, type CoarSelectOption, type CoarSelectSize } from '@cocoar/vue-ui';
import { useLocalization } from '@cocoar/vue-localization';

interface Props {
  /** Current display zone (IANA id). */
  modelValue: string;
  /**
   * Override the curated list. When omitted, a small built-in list of
   * common zones is used, with the browser-detected zone prepended if
   * it isn't already in the list.
   */
  options?: CoarSelectOption<string>[];
  size?: CoarSelectSize;
  /** Forwarded to the underlying `<CoarSelect>` for layout flows. */
  fullWidth?: boolean;
  /** Disabled state — no selection mutation. */
  disabled?: boolean;
}
const props = withDefaults(defineProps<Props>(), {
  options: undefined,
  size: 'm',
  fullWidth: false,
  disabled: false,
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const localization = useLocalization();
const t = localization?.t ?? ((_k: string, _p?: unknown, fb?: string) => fb ?? '');

/**
 * Curated default — covers the common "show me my colleagues' day"
 * workflow without imposing the full ~ 400-zone IANA list. Consumers
 * who need everything pass `:options="customList"`.
 */
const DEFAULT_ZONES: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'Europe/Vienna',       label: 'Vienna (Europe/Vienna)' },
  { id: 'Europe/Berlin',       label: 'Berlin (Europe/Berlin)' },
  { id: 'Europe/London',       label: 'London (Europe/London)' },
  { id: 'America/New_York',    label: 'New York (America/New_York)' },
  { id: 'America/Los_Angeles', label: 'Los Angeles (America/Los_Angeles)' },
  { id: 'Asia/Tokyo',          label: 'Tokyo (Asia/Tokyo)' },
  { id: 'UTC',                 label: 'UTC' },
];

function detectBrowserZone(): string {
  // SSR / very-old envs may not have resolvedOptions; fall back gracefully.
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

const resolvedOptions = computed<CoarSelectOption<string>[]>(() => {
  if (props.options) return props.options;
  const browserTz = detectBrowserZone();
  const browserSuffix = t(
    'coar.calendar.zoneSwitcher.browserSuffix',
    undefined,
    'browser',
  );
  const out: CoarSelectOption<string>[] = DEFAULT_ZONES.map((z) => ({
    value: z.id,
    label: z.label,
  }));
  // Prepend the browser-detected zone if it isn't already in the list.
  if (!out.some((o) => o.value === browserTz)) {
    out.unshift({ value: browserTz, label: `${browserTz} (${browserSuffix})` });
  }
  return out;
});

const ariaLabel = computed(() =>
  t('coar.calendar.zoneSwitcher.label', undefined, 'Display timezone'),
);

function onUpdate(v: string | null | undefined) {
  if (v == null) return;
  emit('update:modelValue', v);
}
</script>

<template>
  <CoarSelect
    :model-value="modelValue"
    :options="resolvedOptions"
    :size="size"
    :full-width="fullWidth"
    :disabled="disabled"
    :aria-label="ariaLabel"
    class="coar-display-zone-switcher"
    @update:model-value="onUpdate"
  />
</template>
