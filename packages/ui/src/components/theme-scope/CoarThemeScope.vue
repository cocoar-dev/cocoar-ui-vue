<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  useTemplateRef,
} from 'vue';

export type CoarThemeMode = 'auto' | 'light' | 'dark';

/**
 * Stable, high-level theme inputs. Consumers own the values; the component
 * maps them onto Cocoar's token graph without exposing that graph as API.
 */
export interface CoarTheme {
  accent?: string;
  success?: string;
  warning?: string;
  error?: string;
  info?: string;
  buttonRadius?: string | number;
  inputRadius?: string | number;
  cardRadius?: string | number;
  bodyFontFamily?: string;
  titleFontFamily?: string;
}

const props = withDefaults(defineProps<{
  theme?: CoarTheme;
  mode?: CoarThemeMode;
}>(), {
  theme: () => ({}),
  mode: 'auto',
});

const scopeRef = useTemplateRef<HTMLElement>('scopeRef');
const detectedMode = ref<'light' | 'dark'>('light');
let observer: MutationObserver | undefined;
let media: MediaQueryList | undefined;

function modeOn(element: Element | null): 'light' | 'dark' | undefined {
  if (!element) return undefined;
  if (element.classList.contains('dark-mode') || element.getAttribute('data-theme') === 'dark') return 'dark';
  if (element.classList.contains('light-mode') || element.getAttribute('data-theme') === 'light') return 'light';
  return undefined;
}

function detectMode() {
  let current = scopeRef.value?.parentElement ?? null;
  while (current) {
    const explicit = modeOn(current);
    if (explicit) {
      detectedMode.value = explicit;
      return;
    }
    current = current.parentElement;
  }
  detectedMode.value = media?.matches ? 'dark' : 'light';
}

const effectiveMode = computed<'light' | 'dark'>(() =>
  props.mode === 'auto' ? detectedMode.value : props.mode,
);

function cssLength(value: string | number | undefined): string | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? `${value}px` : undefined;
  return value?.trim() || undefined;
}

function assignFamily(target: Record<string, string>, family: string | undefined, tokens: string[]) {
  if (!family?.trim()) return;
  for (const token of tokens) target[token] = family;
}

const tokenStyle = computed<Record<string, string>>(() => {
  const theme = props.theme;
  const result: Record<string, string> = {};
  if (theme.accent) result['--coar-accent'] = theme.accent;
  if (theme.success) result['--coar-success'] = theme.success;
  if (theme.warning) result['--coar-warning'] = theme.warning;
  if (theme.error) result['--coar-error'] = theme.error;
  if (theme.info) result['--coar-info'] = theme.info;

  const buttonRadius = cssLength(theme.buttonRadius);
  const inputRadius = cssLength(theme.inputRadius);
  const cardRadius = cssLength(theme.cardRadius);
  if (buttonRadius) result['--coar-button-radius'] = buttonRadius;
  if (inputRadius) result['--coar-input-radius'] = inputRadius;
  if (cardRadius) result['--coar-card-radius'] = cardRadius;

  assignFamily(result, theme.bodyFontFamily, [
    '--coar-font-family-body',
    '--coar-body-base-family',
    '--coar-body-bold-family',
    '--coar-body-caption-family',
    '--coar-body-footnote-family',
    '--coar-body-small-base-family',
    '--coar-body-small-bold-family',
  ]);
  assignFamily(result, theme.titleFontFamily, [
    '--coar-font-family-title',
    '--coar-headings-heading-family',
    '--coar-headings-subheading-family',
    '--coar-titles-display-family',
    '--coar-titles-subtitle-family',
    '--coar-titles-title-family',
  ]);
  return result;
});

onMounted(() => {
  media = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : undefined;
  detectMode();
  media?.addEventListener?.('change', detectMode);

  if (typeof MutationObserver !== 'undefined') {
    observer = new MutationObserver(detectMode);
    let current = scopeRef.value?.parentElement ?? null;
    while (current) {
      observer.observe(current, { attributes: true, attributeFilter: ['class', 'data-theme'] });
      current = current.parentElement;
    }
  }
});

onBeforeUnmount(() => {
  observer?.disconnect();
  media?.removeEventListener?.('change', detectMode);
});
</script>

<template>
  <div
    ref="scopeRef"
    class="coar-theme-scope"
    :class="effectiveMode === 'dark' ? 'dark-mode' : 'light-mode'"
    :data-coar-theme-mode="effectiveMode"
    :style="tokenStyle"
  >
    <slot />
  </div>
</template>

<style>
/* A theme boundary should not insert a layout box. Its DOM node still owns
   the inheritable custom properties and is discoverable by teleported overlays. */
.coar-theme-scope {
  display: contents;
}
</style>
