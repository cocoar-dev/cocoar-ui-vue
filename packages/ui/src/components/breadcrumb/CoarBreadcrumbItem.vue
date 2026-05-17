<script setup lang="ts">
import { computed, watch } from 'vue';
// Type-only import — erased at runtime, no bundling impact. See
// `CoarSidebarItem.vue` for the full soft-router-dep rationale.
import type { RouteLocationRaw } from 'vue-router';
import CoarIcon from '../icon/CoarIcon.vue';
import { useRouterLink } from '../_internal/use-router-link';

const props = withDefaults(
  defineProps<{
    /**
     * Vue Router target. When set, the item renders as `<a href>` instead of
     * requiring the consumer to slot an `<a>` / `<RouterLink>` themselves —
     * for the common 90% case where every crumb is a link. Routing is via
     * `<RouterLink>` if `vue-router` is installed and registered, otherwise
     * a plain `<a href={String(to)}>` fallback.
     *
     * If `active` is also set, `to` is intentionally IGNORED: the current
     * page is by WAI-ARIA convention NOT a link to itself, so the item
     * renders as `<span aria-current="page">`. Consumers can pass `to` for
     * every crumb (including the last) without stripping it manually — the
     * `active` flag is the single source of truth for "this is current page".
     */
    to?: RouteLocationRaw | string;
    /**
     * External `href`. Used when `to` is not set — for absolute URLs and
     * non-router targets. Same active-wins rule as `to`.
     */
    href?: string;
    /**
     * Leading icon name (rendered before the slot content, inside the `<a>` /
     * `<span>` so it shares the link's hit-area and styling). Override with
     * the `#icon` slot for custom content (avatar, badge, coloured icon).
     */
    icon?: string;
    /**
     * Marks this item as the current page. Renders as a non-interactive
     * `<span aria-current="page">` even if `to` / `href` are set. Convention
     * is that the last breadcrumb is the active one.
     */
    active?: boolean;
    /**
     * Visually de-activates the link. `aria-disabled="true"`, `tabindex="-1"`,
     * navigation suppressed. Only meaningful in link mode (no effect on
     * active mode — already non-interactive — or on bare-slot mode).
     */
    disabled?: boolean;
  }>(),
  {
    to: undefined,
    href: undefined,
    icon: undefined,
    active: false,
    disabled: false,
  },
);

const { RouterLink, hasRouterLink, warnIfMisconfigured } = useRouterLink();
watch(
  () => props.to,
  (to) => warnIfMisconfigured(to, 'CoarBreadcrumbItem'),
  { immediate: true },
);

const hasTo = computed(() => props.to !== undefined && props.to !== null);
const hasHref = computed(() => props.href !== undefined && props.href !== null);

// Render-mode decision tree, ordered by precedence:
//
//   active=true       → <span aria-current="page">  (no link; current page)
//   to=… + router OK  → <RouterLink custom> + <a>   (SPA-routed)
//   to=… (no router)  → <a href={String(to)}>       (browser navigation)
//   href=…            → <a href={href}>             (external)
//   none of the above → bare <slot/>                (escape hatch — custom
//                                                    content like a select)
//
// `active` wins over `to`/`href` so consumers can build the trail
// programmatically (`items.map(i => <Item :to="i.path" :active="i.isLast">`)
// without filtering the last item.
const renderMode = computed<'active' | 'router-link' | 'plain-link' | 'slot-only'>(() => {
  if (props.active) return 'active';
  if (hasTo.value && hasRouterLink) return 'router-link';
  if (hasTo.value || hasHref.value) return 'plain-link';
  return 'slot-only';
});

const linkHref = computed(() => {
  if (hasTo.value) return String(props.to);
  if (hasHref.value) return props.href as string;
  return undefined;
});

function handleClick(event: MouseEvent): void {
  if (props.disabled) {
    event.preventDefault();
    event.stopPropagation();
  }
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
  // Custom-slot RouterLink: hand off to navigate(). Do NOT preventDefault
  // first — RouterLink.guardEvent bails on already-prevented events.
  if (navigate) {
    void navigate(event);
  }
}
</script>

<template>
  <li
    class="coar-breadcrumb-item"
    :class="{
      'coar-breadcrumb-item--active': active,
      // Marker for the escape-hatch render branch — scopes the `:deep(a)`
      // legacy-styling selector so it ONLY applies to consumer-slotted
      // anchors, not the library's own `<a>` (which already gets its
      // visuals from the `.coar-breadcrumb-link` class).
      'coar-breadcrumb-item--slot-only': renderMode === 'slot-only',
    }"
    :aria-current="active ? 'page' : undefined"
  >
    <!-- Active mode: non-interactive current-page marker. `aria-current` is
         on BOTH the <li> (back-compat with the original CSS-only API where
         consumers slotted plain text) and the inner <span>, so screen
         readers announce it whichever element they navigate to. -->
    <span
      v-if="renderMode === 'active'"
      class="coar-breadcrumb-link coar-breadcrumb-link--active"
      aria-current="page"
    >
      <slot name="icon">
        <CoarIcon v-if="icon" :name="icon" size="s" class="coar-breadcrumb-link__icon" />
      </slot>
      <slot />
    </span>

    <!-- Router-link mode: <RouterLink custom> exposes href + navigate. We
         render the <a> ourselves so icon + content go inside the link's
         hit-area (better mobile-touch target) and so we keep full control
         of disabled handling. -->
    <component
      :is="RouterLink"
      v-else-if="renderMode === 'router-link'"
      :to="to"
      custom
    >
      <template #default="{ href: routerHref, navigate }">
        <a
          :href="routerHref"
          class="coar-breadcrumb-link"
          :class="{ 'coar-breadcrumb-link--disabled': disabled }"
          :aria-disabled="disabled || undefined"
          :tabindex="disabled ? -1 : undefined"
          @click="(e) => handleAnchorClick(e, navigate)"
        >
          <slot name="icon">
            <CoarIcon v-if="icon" :name="icon" size="s" class="coar-breadcrumb-link__icon" />
          </slot>
          <slot />
        </a>
      </template>
    </component>

    <!-- Plain-link mode: `href`-only OR `to` without router. -->
    <a
      v-else-if="renderMode === 'plain-link'"
      :href="linkHref"
      class="coar-breadcrumb-link"
      :class="{ 'coar-breadcrumb-link--disabled': disabled }"
      :aria-disabled="disabled || undefined"
      :tabindex="disabled ? -1 : undefined"
      @click="handleClick"
    >
      <slot name="icon">
        <CoarIcon v-if="icon" :name="icon" size="s" class="coar-breadcrumb-link__icon" />
      </slot>
      <slot />
    </a>

    <!-- Escape hatch: no `to` / `href` / `active` → just render whatever the
         consumer passes. Used for custom inline UI like an inline
         <CoarSelect> for "switch project" within the trail. Original
         CSS-only API (consumer slotting their own <a>) also falls in here. -->
    <slot v-else />
  </li>
</template>

<style scoped>
.coar-breadcrumb-item {
  display: inline-flex;
  align-items: center;
}

/* CSS custom properties inherit, so --coar-breadcrumb-separator set on the
   parent <nav> is accessible here even in scoped styles. */
.coar-breadcrumb-item + .coar-breadcrumb-item::before {
  content: var(--coar-breadcrumb-separator);
  color: var(--coar-breadcrumb-separator-color);
  margin-right: var(--coar-breadcrumb-separator-gap);
  user-select: none;
}

/* Library-rendered link (`<a>` from router-link / plain-link modes).
   Same visual treatment as the legacy `:deep(a)` rule below so both layers
   produce identical-looking links. */
.coar-breadcrumb-link {
  display: inline-flex;
  align-items: center;
  gap: var(--coar-breadcrumb-icon-gap, 0.375rem);
  color: var(--coar-breadcrumb-link-color);
  text-decoration: none;
}

.coar-breadcrumb-link:hover:not(.coar-breadcrumb-link--disabled) {
  text-decoration: underline;
}

.coar-breadcrumb-link:focus-visible {
  outline: var(--coar-focus-width) var(--coar-focus-style) var(--coar-focus-color);
  outline-offset: 2px;
  border-radius: var(--coar-radius-xxs);
}

.coar-breadcrumb-link--disabled {
  color: var(--coar-text-neutral-disabled);
  cursor: not-allowed;
  text-decoration: none;
}

.coar-breadcrumb-link--active {
  color: var(--coar-breadcrumb-active-color);
  font-weight: var(--coar-font-weight-medium);
  cursor: default;
}

.coar-breadcrumb-link__icon {
  flex-shrink: 0;
}

/* `:deep(a)` because <a> in the slot-only escape-hatch is slotted content
   from the parent and won't carry this component's scoped attribute.
   Scoped to `--slot-only` so it does NOT double-apply on top of the
   library-rendered `.coar-breadcrumb-link` rules above (which would silently
   merge today and risk divergence if either set of properties changes). */
.coar-breadcrumb-item--slot-only :deep(a) {
  color: var(--coar-breadcrumb-link-color);
  text-decoration: none;
}

.coar-breadcrumb-item--slot-only :deep(a:hover) {
  text-decoration: underline;
}

.coar-breadcrumb-item--active {
  color: var(--coar-breadcrumb-active-color);
  font-weight: var(--coar-font-weight-medium);
}
</style>
