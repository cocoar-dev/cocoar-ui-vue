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
</script>

<script setup lang="ts">
import { computed, inject, provide } from 'vue';
import { isElementAllowed, type PageNode, type StackNode } from './schema';
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
</script>

<template>
  <template v-if="allowed">
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
