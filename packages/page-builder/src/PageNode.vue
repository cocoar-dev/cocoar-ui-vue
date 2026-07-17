<script lang="ts">
import type { InjectionKey, ComputedRef } from 'vue';
import type { FlexDirection } from './styleMapping';

/**
 * Direction of the nearest flex container, provided down the recursive tree so a
 * node can map `size: 'fill'` to the correct axis (grow in a row, full-width in
 * a column). Module-scoped so every PageNode instance shares the same key.
 */
const PB_PARENT_DIRECTION: InjectionKey<ComputedRef<FlexDirection>> =
  Symbol('pb-parent-direction');

/** A throwing consumer `submitOnEnter` predicate warns once per type, not per keystroke. */
const warnedEnterHookThrew = new Set<string>();
</script>

<script setup lang="ts">
import { computed, inject, provide } from 'vue';
import { isElementAllowed, type ElementNode, type PageNode, type StackNode } from './schema';
import { selfStyle, containerLayoutStyle } from './styleMapping';
import { PAGE_RENDERER_KEY } from './context';

defineOptions({ name: 'PageNode' });

const props = defineProps<{ node: PageNode }>();

const ctx = inject(PAGE_RENDERER_KEY);
if (!ctx) throw new Error('PageNode must be rendered inside CoarPageRenderer.');

/**
 * Allow-list gate — the renderer is the security boundary. If a node type is
 * not in `config.allowedElements`, render nothing. Containers still recurse;
 * each descendant is gated on its own type.
 */
const allowed = computed(() => {
  const ok = isElementAllowed(props.node.type, ctx!.config);
  if (!ok) ctx!.reportDisallowed?.(props.node.type);
  return ok;
});

/**
 * `visibleWhen` gate — reactive against the live value model (the host owns
 * the evaluation). A hidden node takes its whole subtree with it; the value
 * model applies the same gate, so hidden fields neither veto nor ship.
 */
const visible = computed(() => ctx!.isVisible(props.node));

/**
 * Registry dispatch: the definition supplies the renderer component; the host
 * owns everything around it (allow gate, self-style, children recursion). An
 * allowed-but-unregistered type renders nothing and warns once — a production
 * page is not an authoring surface, so no placeholder chrome appears here
 * (the builder canvas is where missing registrations are made visible).
 */
const def = computed(() => {
  if (props.node.type === 'page') return undefined;
  const d = ctx!.elements.value[props.node.type];
  if (!d && allowed.value) ctx!.reportUnknown?.(props.node.type);
  return d;
});

// ─── Style helpers ────────────────────────────────────────────────────────────
// Mapping lives in styleMapping.ts (pure, unit-tested). `wrapperStyle` is the
// node's own outer style, applied onto the renderer's root element via
// attribute fallthrough (element renderers are single-root by contract).

// Direction-aware sizing: read the parent container's direction, and tell our
// own children what direction WE impose on them.
const parentDirection = inject(PB_PARENT_DIRECTION, undefined);
const ownDirection = computed<FlexDirection>(() =>
  props.node.type === 'stack'
    ? ((props.node as StackNode).props.direction ?? 'column')
    : 'column',
);
provide(PB_PARENT_DIRECTION, ownDirection);

const wrapperStyle = computed(() =>
  selfStyle(props.node.style, parentDirection?.value ?? 'column'),
);

const children = computed(() =>
  'children' in props.node && Array.isArray(props.node.children) ? props.node.children : [],
);

/**
 * Enter-to-submit eligibility, declared by the definition
 * (`value.submitOnEnter`). Marked as a data attribute on the renderer's root
 * (attribute fallthrough), so the renderer host can resolve a bubbled Enter
 * keydown back to "came from an eligible input" via `closest()` — no
 * per-element wiring, and consumer elements participate by declaration alone.
 */
const enterEligible = computed(() => {
  const spec = def.value?.value?.submitOnEnter;
  if (!spec) return false;
  if (typeof spec !== 'function') return true;
  try {
    return !!spec((props.node as ElementNode).props ?? {});
  } catch (e) {
    if (!warnedEnterHookThrew.has(props.node.type)) {
      warnedEnterHookThrew.add(props.node.type);
      console.warn(`[CoarPageRenderer] submitOnEnter hook of element "${props.node.type}" threw — treated as not eligible.`, e);
    }
    return false;
  }
});
</script>

<template>
  <template v-if="allowed && visible">
    <!-- ── page root (host-owned; always a column) ─────────────────────────── -->
    <div
      v-if="node.type === 'page'"
      class="pb-page"
      :style="{ ...wrapperStyle, ...containerLayoutStyle(node.style) }"
    >
      <PageNode v-for="child in children" :key="child.id" :node="child" />
    </div>

    <!-- ── registered element ──────────────────────────────────────────────── -->
    <component
      :is="def.renderer"
      v-else-if="def"
      :node="node"
      :style="wrapperStyle"
      :data-pb-enter-submit="enterEligible ? 'true' : undefined"
    >
      <template v-if="def.container" #default>
        <PageNode v-for="child in children" :key="child.id" :node="child" />
      </template>
    </component>

    <!-- unregistered type: render nothing (warned once above) -->
  </template>
</template>

<style scoped>
.pb-page {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
</style>
