<script lang="ts">
import {
  COAR_BUILTIN_ICON_SOURCE_KEY,
  CoarIconMapSource,
  CoarIconService,
} from './icon-service';
import { CORE_ICONS } from './core-icons';

// Module-level singleton: shared fallback when no CoarIconPlugin is installed.
const fallbackService = new CoarIconService();
fallbackService.registerSource(
  COAR_BUILTIN_ICON_SOURCE_KEY,
  new CoarIconMapSource(CORE_ICONS),
);
</script>

<script setup lang="ts">
import { ref, watchEffect, inject, computed } from 'vue';
import {
  COAR_ICON_SERVICE_KEY,
  PRESET_SIZES,
  type CoarIconSize,
} from './icon-service';

export interface CoarIconProps {
  /** Icon identifier (e.g. "settings", "user") */
  name?: string;
  /** Optional icon source key to target a specific registry */
  source?: string;
  /** Icon size — preset token or custom CSS value (e.g. '42px', '3rem') */
  size?: CoarIconSize | string;
  /** Rotation angle in degrees */
  rotate?: number;
  /** Rotation transition — number (ms) or CSS transition string */
  rotateTransition?: number | string;
  /** Enable continuous spinning animation */
  spin?: boolean;
  /** Icon color (any CSS color value). Use 'inherit' to inherit parent color. */
  color?: string;
  /** Optional text label displayed next to the icon */
  label?: string | number;
}

const props = withDefaults(defineProps<CoarIconProps>(), {
  name: undefined,
  source: undefined,
  size: 'm',
  rotate: 0,
  rotateTransition: undefined,
  spin: false,
  color: 'inherit',
  label: undefined,
});

// ─── Icon service (injected or plugin-provided, else shared fallback) ────────

const iconService = inject(COAR_ICON_SERVICE_KEY, null) ?? fallbackService;

// ─── Reactive icon loading ───────────────────────────────────────────────────

const svgContent = ref<string | null>(null);
const isLoading = ref(false);
let loadVersion = 0;

watchEffect((onCleanup) => {
  const iconName = props.name;
  const sourceKey = props.source;

  if (!iconName) {
    loadVersion++;
    svgContent.value = null;
    isLoading.value = false;
    return;
  }

  const currentVersion = ++loadVersion;
  svgContent.value = null;
  isLoading.value = true;

  const result = iconService.getIcon(iconName, sourceKey);

  if (result instanceof Promise) {
    let cancelled = false;
    onCleanup(() => { cancelled = true; });

    result.then((svg) => {
      if (cancelled || currentVersion !== loadVersion) return;
      svgContent.value = svg;
      isLoading.value = false;
    }).catch(() => {
      if (cancelled || currentVersion !== loadVersion) return;
      svgContent.value = null;
      isLoading.value = false;
    });
  } else {
    svgContent.value = result;
    isLoading.value = false;
  }
});

// ─── Computed helpers ────────────────────────────────────────────────────────

const isPreset = computed(() => PRESET_SIZES.has(props.size));

const LABEL_SIZE_MAP: Record<string, string> = {
  xs: 'xs', s: 's', m: 'm', l: 'l', xl: 'l', auto: 'm',
};

const hostClasses = computed(() => [
  'coar-icon-host',
  `coar-icon-host--${LABEL_SIZE_MAP[props.size] ?? 'm'}`,
]);

const iconClasses = computed(() => [
  'coar-icon',
  isPreset.value ? `coar-icon--${props.size}` : '',
  props.spin ? 'coar-icon--spin' : '',
].filter(Boolean));

const loadingClasses = computed(() => [
  'coar-icon',
  'coar-icon--loading',
  isPreset.value ? `coar-icon--${props.size}` : '',
].filter(Boolean));

const customSizeStyle = computed(() =>
  !isPreset.value ? { width: props.size, height: props.size } : undefined,
);

const rotateStyle = computed(() => ({
  transform: `rotate(${props.rotate}deg)`,
  color: props.color,
  ...customSizeStyle.value,
  ...(rotateTransitionValue.value ? { transition: rotateTransitionValue.value } : {}),
}));

const rotateTransitionValue = computed(() => {
  const t = props.rotateTransition;
  if (t == null) return null;
  if (typeof t === 'number') return `transform ${t}ms ease-in-out`;
  if (!t.includes('transform')) return `transform ${t}`;
  return t;
});
</script>

<template>
  <span :class="hostClasses" :icon-name="name">
    <!-- Loaded SVG -->
    <span
      v-if="name && svgContent"
      :class="iconClasses"
      :style="rotateStyle"
      v-html="svgContent"
    />
    <!-- Loading placeholder -->
    <span
      v-else-if="name && isLoading"
      :class="loadingClasses"
      :style="customSizeStyle"
    />

    <!-- Label -->
    <span v-if="label != null" class="coar-icon__label">{{ label }}</span>
    <span v-else class="coar-icon__label">
      <slot />
    </span>
  </span>
</template>

<style scoped>
/**
 * COAR Icon Component Styles
 *
 * Size tokens: xs=12px, s=16px, m=20px, l=24px, xl=32px, auto=fills parent
 */

.coar-icon-host {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  max-width: 100%;
  max-height: 100%;
}

.coar-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  vertical-align: middle;
  line-height: var(--coar-line-height-none);
  aspect-ratio: 1;
}

/* SVG fills container and inherits color */
.coar-icon :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
  fill: currentColor;
}

/* Override hardcoded fills in SVG elements */
.coar-icon :deep(svg path),
.coar-icon :deep(svg circle),
.coar-icon :deep(svg rect),
.coar-icon :deep(svg polygon),
.coar-icon :deep(svg polyline),
.coar-icon :deep(svg line),
.coar-icon :deep(svg ellipse) {
  fill: currentColor;
}

/* For stroke-based icons, inherit stroke color */
.coar-icon :deep(svg[stroke='currentColor'] path),
.coar-icon :deep(svg[stroke='currentColor'] circle),
.coar-icon :deep(svg[stroke='currentColor'] line) {
  fill: none;
  stroke: currentColor;
}

.coar-icon--xs { width: 12px; height: 12px; }
.coar-icon--s  { width: 16px; height: 16px; }
.coar-icon--m  { width: 20px; height: 20px; }
.coar-icon--l  { width: 24px; height: 24px; }
.coar-icon--xl { width: 32px; height: 32px; }

.coar-icon--auto {
  width: auto;
  height: 100%;
  max-width: 1em;
  max-height: 1em;
}

.coar-icon--loading {
  opacity: 0.3;
  background: currentColor;
  border-radius: 2px;
}

.coar-icon--spin {
  animation: coar-icon-spin 1s linear infinite;
}

.coar-icon__label {
  margin-left: var(--coar-spacing-xs, 4px);
}

.coar-icon-host--xs .coar-icon__label { font-size: var(--coar-component-xs-label-font-size); }
.coar-icon-host--s  .coar-icon__label { font-size: var(--coar-component-s-label-font-size); }
.coar-icon-host--m  .coar-icon__label { font-size: var(--coar-component-m-label-font-size); }
.coar-icon-host--l  .coar-icon__label { font-size: var(--coar-component-l-label-font-size); }

.coar-icon__label:empty {
  margin-left: 0;
}

@keyframes coar-icon-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .coar-icon--spin {
    animation: none;
  }
}
</style>
