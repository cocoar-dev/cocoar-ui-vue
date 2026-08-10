<script lang="ts">
import type { InjectionKey, ComputedRef, CSSProperties } from 'vue';
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
const warnedStylePresets = new Set<string>();
</script>

<script setup lang="ts">
import { computed, inject, provide } from 'vue';
import { isElementAllowed, type ElementNode, type PageNode, type RepeatSelection, type StackNode } from './schema';
import { selfStyle, containerLayoutStyle } from './styleMapping';
import { PAGE_RENDERER_KEY, type RepeatRenderScope } from './context';
import { safeReadPath } from './runtimeBindings';
import { findStylePreset } from './stylePresets';

defineOptions({ name: 'PageNode' });

const props = defineProps<{
  node: PageNode
  item?: unknown
  itemIndex?: number
  allowedItemPaths?: ReadonlySet<string>
  repeatSelection?: RepeatSelection
}>();

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
const visible = computed(() => ctx!.isVisible(props.node, props.item, props.allowedItemPaths));

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

const stylePresetClass = computed(() => {
  if (!props.node.stylePreset) return undefined;
  const preset = findStylePreset(ctx!.config, props.node);
  if (preset) return preset.className;
  const warningKey = `${props.node.type}:${props.node.stylePreset}`;
  if (!warnedStylePresets.has(warningKey)) {
    warnedStylePresets.add(warningKey);
    console.warn(
      `[CoarPageRenderer] Unknown, unsafe, or disallowed style preset "${props.node.stylePreset}" on "${props.node.type}" — ignored.`,
    );
  }
  return undefined;
});

// ─── Style helpers ────────────────────────────────────────────────────────────
// Mapping lives in styleMapping.ts (pure, unit-tested). `wrapperStyle` is the
// node's own outer style, applied onto the renderer's root element via
// attribute fallthrough (element renderers are single-root by contract).

// Direction-aware sizing: read the parent container's direction, and tell our
// own children what direction WE impose on them.
const parentDirection = inject(PB_PARENT_DIRECTION, undefined);
const ownDirection = computed<FlexDirection>(() => {
  // Any container can be a row now, so children must be told the truth or
  // `size` would map against the wrong axis. props.direction stays as the
  // stack's legacy fallback only.
  if (resolvedStyle.value.direction) return resolvedStyle.value.direction;
  return props.node.type === 'stack'
    ? ((props.node as StackNode).props.direction ?? 'column')
    : 'column';
});
provide(PB_PARENT_DIRECTION, ownDirection);

const resolvedStyle = computed(() => ctx!.resolveStyle(props.node));
const resolvedNode = computed<PageNode>(() => {
  const resolved = ctx!.resolveNode(props.node, props.item, props.allowedItemPaths, props.itemIndex);
  if (props.repeatSelection && resolved.type !== 'page' && (resolved as ElementNode).name === '$selection') {
    const selection = props.repeatSelection;
    const value = props.allowedItemPaths?.has(selection.valuePath)
      ? safeReadPath(props.item, selection.valuePath)
      : undefined;
    const required = selection.requiredPath && props.allowedItemPaths?.has(selection.requiredPath)
      ? safeReadPath(props.item, selection.requiredPath) === true
      : false;
    return {
      ...resolved,
      name: selection.name,
      props: { ...(resolved as ElementNode).props, _repeatValue: value, _repeatRequired: required },
      style: resolvedStyle.value,
    } as PageNode;
  }
  return { ...resolved, style: resolvedStyle.value } as PageNode;
});

const wrapperStyle = computed(() =>
  selfStyle(resolvedStyle.value, parentDirection?.value ?? 'column'),
);

/**
 * The page root is always exactly its host container: sizing it is the
 * embedding application's job, done by handing the renderer a box with a
 * height. Own size values are therefore dropped rather than honoured — a
 * document that carries them (percentages cannot resolve against every host)
 * would otherwise fight the container it was placed in.
 *
 * Everything else, including overflow, still comes from the document.
 */
const PAGE_ROOT_IGNORED_SIZE = [
  'width', 'minWidth', 'maxWidth', 'height', 'minHeight', 'maxHeight', 'flex', 'aspectRatio',
] as const;

const pageRootStyle = computed<CSSProperties>(() => {
  const css = { ...wrapperStyle.value } as Record<string, unknown>;
  for (const key of PAGE_ROOT_IGNORED_SIZE) delete css[key];
  return css as CSSProperties;
});

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
      :class="['pb-page', stylePresetClass]"
      :style="{ ...pageRootStyle, ...containerLayoutStyle(resolvedStyle) }"
    >
      <PageNode
        v-for="child in children"
        :key="child.id"
        :node="child"
        :item="item"
        :item-index="itemIndex"
        :allowed-item-paths="allowedItemPaths"
        :repeat-selection="repeatSelection"
      />
    </div>

    <!-- ── registered element ──────────────────────────────────────────────── -->
    <component
      :is="def.renderer"
      v-else-if="def"
      :node="resolvedNode"
      :style="wrapperStyle"
      :class="stylePresetClass"
      :data-pb-enter-submit="enterEligible ? 'true' : undefined"
    >
      <template v-if="def.container" #default="slotScope: RepeatRenderScope">
        <PageNode
          v-for="child in children"
          :key="`${child.id}:${node.type === 'repeat' ? slotScope?.itemKey : ''}`"
          :node="child"
          :item="node.type === 'repeat' ? slotScope?.item : item"
          :item-index="node.type === 'repeat' ? slotScope?.index : itemIndex"
          :allowed-item-paths="node.type === 'repeat' ? slotScope?.allowedItemPaths : allowedItemPaths"
          :repeat-selection="node.type === 'repeat' ? slotScope?.selection : repeatSelection"
        />
      </template>
    </component>

    <!-- unregistered type: render nothing (warned once above) -->
  </template>
</template>

<style scoped>
/*
 * Exactly the host container, never more: whether that is the body, an overlay
 * or a virtualised grid cell, the embedding application owns the size.
 *
 * overflow:auto rather than hidden — clipping would make content that does not
 * fit unreachable rather than merely unseen, which on a small viewport can hide
 * the very controls a page exists for. A document can still set overflow
 * explicitly; only the size values are ignored.
 */
.pb-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-width: 0;
  overflow: auto;
}
</style>
