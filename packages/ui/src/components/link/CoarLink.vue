<script setup lang="ts">
import { computed, watch } from 'vue';
// Type-only import — erased at runtime, no bundling impact. See
// `CoarSidebarItem.vue` for the full soft-router-dep rationale.
import type { RouteLocationRaw } from 'vue-router';
import { useRouterLink } from '../_internal/use-router-link';

export type CoarLinkVariant = 'accent' | 'subtle';
export type CoarLinkSize = 's' | 'm' | 'l';

export interface CoarLinkProps {
  /**
   * Vue Router target. Takes precedence over `href`. When set the link
   * renders via `<RouterLink>` (if installed) for SPA navigation, or a
   * plain `<a href={String(to)}>` fallback. Modifier-click (Ctrl/Cmd/middle)
   * opens a new tab natively in both cases.
   */
  to?: RouteLocationRaw | string;
  /**
   * External `href`. Used when `to` is not set — for absolute URLs and
   * `mailto:` / `tel:` schemes that have no router target. If `target` is
   * `_blank` and `rel` is not provided, `rel="noopener"` is added
   * automatically to defend against tab-nabbing.
   */
  href?: string;
  /** Visual variant — `accent` is the default link color, `subtle` blends into surrounding text. */
  variant?: CoarLinkVariant;
  /** Typography size — `s`, `m` (default), `l`. */
  size?: CoarLinkSize;
  /** Disabled state — `aria-disabled`, `tabindex=-1`, navigation suppressed. */
  disabled?: boolean;
  /** Anchor `target` attribute. Only applied when rendering as a plain `<a>` (not via `<RouterLink>`). */
  target?: string;
  /** Anchor `rel` attribute. Auto-fills to `noopener` when `target="_blank"` is set and `rel` is omitted. */
  rel?: string;
}

const props = withDefaults(defineProps<CoarLinkProps>(), {
  to: undefined,
  href: undefined,
  variant: 'accent',
  size: 'm',
  disabled: false,
  target: undefined,
  rel: undefined,
});

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();

const { RouterLink, hasRouterLink, warnIfMisconfigured } = useRouterLink();
watch(
  () => props.to,
  (to) => warnIfMisconfigured(to, 'CoarLink'),
  { immediate: true },
);

const hasTo = computed(() => props.to !== undefined && props.to !== null);
const hasHref = computed(() => props.href !== undefined && props.href !== null);

const linkClasses = computed(() => [
  'coar-link',
  `coar-link--${props.size}`,
  {
    'coar-link--subtle': props.variant === 'subtle',
    'coar-link--disabled': props.disabled,
  },
]);

// `target="_blank"` without `rel="noopener"` is a known tab-nabbing vector
// (the opened page gets `window.opener` access to the source). Browsers
// auto-set noopener on plain `<a target="_blank">` since 2021, but we
// belt-and-suspenders for older browsers and for consumers who pass
// rel="" intending to override defaults.
const safeRel = computed<string | undefined>(() => {
  if (props.rel !== undefined) return props.rel;
  if (props.target === '_blank') return 'noopener';
  return undefined;
});

function handleClick(event: MouseEvent): void {
  if (props.disabled) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  emit('click', event);
}

function handleAnchorClick(
  event: MouseEvent,
  navigate?: (e?: MouseEvent) => Promise<unknown>,
): void {
  if (props.disabled) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  emit('click', event);
  if (navigate) {
    // RouterLink custom-slot mode — see CoarSidebarItem for the
    // preventDefault-vs-guardEvent rationale.
    void navigate(event);
  }
}
</script>

<template>
  <!-- Branch 1: `to` + RouterLink available — SPA-routed <a>. -->
  <component
    :is="RouterLink"
    v-if="hasTo && hasRouterLink"
    :to="to"
    custom
  >
    <template #default="{ href: routerHref, isActive, navigate }">
      <a
        :href="routerHref"
        :class="linkClasses"
        :aria-disabled="disabled || undefined"
        :aria-current="isActive ? 'page' : undefined"
        :tabindex="disabled ? -1 : undefined"
        @click="(e) => handleAnchorClick(e, navigate)"
      >
        <slot />
      </a>
    </template>
  </component>

  <!-- Branch 2: `to` set, no router — plain <a href={String(to)}>. -->
  <a
    v-else-if="hasTo"
    :href="String(to)"
    :class="linkClasses"
    :aria-disabled="disabled || undefined"
    :tabindex="disabled ? -1 : undefined"
    @click="handleClick"
  >
    <slot />
  </a>

  <!-- Branch 3: `href` set (external link). -->
  <a
    v-else-if="hasHref"
    :href="href"
    :target="target"
    :rel="safeRel"
    :class="linkClasses"
    :aria-disabled="disabled || undefined"
    :tabindex="disabled ? -1 : undefined"
    @click="handleClick"
  >
    <slot />
  </a>

  <!-- Branch 4: neither `to` nor `href` — styled `<button>` for click-emit-
       only "fake-link" UI. Uses a real `<button>` rather than `<a role="button">`
       because an `<a>` without `href` is not a link per the HTML spec — it
       falls back to a "placeholder hyperlink" and screenreaders disagree on
       how to announce it. `<button type="button">` is the semantically-correct
       element for "looks like a link but triggers a callback", and we get
       Enter + Space activation natively without the keydown workarounds the
       <a role="button"> approach needs. The `.coar-link` class still applies
       so the visual treatment is identical. -->
  <button
    v-else
    type="button"
    :class="[linkClasses, 'coar-link--as-button']"
    :disabled="disabled"
    :aria-disabled="disabled || undefined"
    @click="handleClick"
  >
    <slot />
  </button>
</template>

<!--
  All styling lives in `packages/ui/styles/link.css` so the legacy CSS-only
  pattern (consumers writing `<a class="coar-link">` directly without using
  this SFC) keeps working. Adding a `<style scoped>` block here would split
  the styling source and break consumers who relied on the unscoped classes.
-->
