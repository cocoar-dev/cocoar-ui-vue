<script setup lang="ts">
import { computed, inject, type CSSProperties } from 'vue';
import {
  CoarButton,
  CoarCard,
  CoarCheckbox,
  CoarDivider,
  CoarFormField,
  CoarPasswordInput,
  CoarSelect,
  CoarTextInput,
  type CoarSelectOption,
} from '@cocoar/vue-ui';
import { isContainerNode, isElementAllowed, type PageNode, type NodeStyle } from './schema';
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

// ─── Style helpers ────────────────────────────────────────────────────────────

function styleFromNode(style?: NodeStyle): CSSProperties {
  if (!style) return {};
  const css: CSSProperties = {};
  if (style.padding) css.padding = style.padding;
  if (style.width) css.width = style.width;
  return css;
}

function containerLayoutStyle(node: PageNode & { style?: NodeStyle }): CSSProperties {
  const gap = node.style?.gap;
  const align = node.style?.align;
  const css: CSSProperties = {};
  if (gap) css.gap = gap;
  if (align) css.alignItems = align;
  return css;
}

const wrapperStyle = computed<CSSProperties>(() => styleFromNode(props.node.style));

// ─── Narrowed typed views (templates can't narrow discriminated unions) ────────

const n = computed(() => props.node);

// ─── Action wiring ────────────────────────────────────────────────────────────

function callAction(id?: string, validates?: boolean) {
  if (!id) return;
  ctx!.triggerAction(id, validates);
}

// ─── Asset resolution ─────────────────────────────────────────────────────────

function resolveAsset(assetId: string): string {
  return ctx!.assetResolver?.(assetId) ?? '';
}

// ─── Select options helper ────────────────────────────────────────────────────

function toSelectOptions(
  options?: { value: string; label: string }[],
): CoarSelectOption<string>[] {
  return (options ?? []).map((o) => ({ value: o.value, label: o.label }));
}
</script>

<template>
  <template v-if="allowed">
  <!-- ── page (root, always column-direction) ────────────────────────────── -->
  <div
    v-if="n.type === 'page'"
    class="pb-stack"
    :style="{ ...wrapperStyle, ...containerLayoutStyle(n) }"
  >
    <PageNode v-for="child in n.children" :key="child.id" :node="child" />
  </div>

  <!-- ── stack (generic flex container) ──────────────────────────────────── -->
  <div
    v-else-if="n.type === 'stack'"
    class="pb-stack"
    :class="{
      'pb-stack--row': n.direction === 'row',
      'pb-stack--wrap': n.wrap,
    }"
    :style="{ ...wrapperStyle, ...containerLayoutStyle(n) }"
  >
    <PageNode v-for="child in n.children" :key="child.id" :node="child" />
  </div>

  <!-- ── card ─────────────────────────────────────────────────────────────── -->
  <CoarCard
    v-else-if="n.type === 'card'"
    :title="n.title"
    :style="wrapperStyle"
  >
    <div class="pb-card-body" :style="containerLayoutStyle(n)">
      <PageNode v-for="child in n.children" :key="child.id" :node="child" />
    </div>
  </CoarCard>

  <!-- ── section ──────────────────────────────────────────────────────────── -->
  <section
    v-else-if="n.type === 'section'"
    class="pb-section"
    :style="wrapperStyle"
  >
    <h3 v-if="n.title" class="pb-section__title">{{ n.title }}</h3>
    <div class="pb-section__body" :style="containerLayoutStyle(n)">
      <PageNode v-for="child in n.children" :key="child.id" :node="child" />
    </div>
  </section>

  <!-- ── divider ──────────────────────────────────────────────────────────── -->
  <CoarDivider v-else-if="n.type === 'divider'" :style="wrapperStyle" />

  <!-- ── spacer ───────────────────────────────────────────────────────────── -->
  <div
    v-else-if="n.type === 'spacer'"
    class="pb-spacer"
    :style="n.size ? { height: n.size, width: n.size } : { flex: '1' }"
  />

  <!-- ── heading ──────────────────────────────────────────────────────────── -->
  <component
    :is="`h${n.level ?? 2}`"
    v-else-if="n.type === 'heading'"
    class="pb-heading"
    :style="wrapperStyle"
  >
    {{ n.text }}
  </component>

  <!-- ── paragraph ────────────────────────────────────────────────────────── -->
  <p
    v-else-if="n.type === 'paragraph'"
    class="pb-paragraph"
    :style="wrapperStyle"
  >
    {{ n.text }}
  </p>

  <!-- ── text-input ───────────────────────────────────────────────────────── -->
  <CoarFormField
    v-else-if="n.type === 'text-input'"
    :label="n.label"
    :required="n.validation?.required"
    :error="n.name ? ctx.getError(n.name) : ''"
    :disabled="n.disabled"
    :style="wrapperStyle"
  >
    <CoarPasswordInput
      v-if="n.inputType === 'password'"
      :model-value="n.name ? (ctx.getValue(n.name) as string ?? '') : ''"
      :placeholder="n.placeholder"
      :disabled="n.disabled"
      @update:model-value="(v) => n.name && ctx.setValue(n.name, v)"
      @blurred="n.name && ctx.markTouched(n.name)"
    />
    <CoarTextInput
      v-else
      :model-value="n.name ? (ctx.getValue(n.name) as string ?? '') : ''"
      :placeholder="n.placeholder"
      :disabled="n.disabled"
      @update:model-value="(v) => n.name && ctx.setValue(n.name, v)"
      @blurred="n.name && ctx.markTouched(n.name)"
    />
  </CoarFormField>

  <!-- ── checkbox ─────────────────────────────────────────────────────────── -->
  <CoarCheckbox
    v-else-if="n.type === 'checkbox'"
    :model-value="n.name ? (ctx.getValue(n.name) as boolean ?? false) : false"
    :label="n.label"
    :required="n.validation?.required"
    :disabled="n.disabled"
    :style="wrapperStyle"
    @update:model-value="(v) => n.name && ctx.setValue(n.name, v)"
  />

  <!-- ── select ───────────────────────────────────────────────────────────── -->
  <CoarFormField
    v-else-if="n.type === 'select'"
    :label="n.label"
    :required="n.validation?.required"
    :error="n.name ? ctx.getError(n.name) : ''"
    :disabled="n.disabled"
    :style="wrapperStyle"
  >
    <CoarSelect
      :model-value="n.name ? (ctx.getValue(n.name) as string ?? null) : null"
      :options="toSelectOptions(n.options)"
      :placeholder="n.placeholder"
      :disabled="n.disabled"
      @update:model-value="(v) => n.name && ctx.setValue(n.name, v)"
    />
  </CoarFormField>

  <!-- ── button ───────────────────────────────────────────────────────────── -->
  <CoarButton
    v-else-if="n.type === 'button'"
    class="pb-button"
    :variant="n.variant ?? 'primary'"
    :size="n.size"
    :icon-left="n.icon"
    :disabled="n.validates && !ctx.isFormValid.value"
    :style="wrapperStyle"
    @click="callAction(n.action, n.validates)"
  >
    {{ n.label }}
  </CoarButton>

  <!-- ── link ─────────────────────────────────────────────────────────────── -->
  <button
    v-else-if="n.type === 'link'"
    class="pb-link"
    :style="wrapperStyle"
    @click="callAction(n.action)"
  >
    {{ n.label }}
  </button>

  <!-- ── image ────────────────────────────────────────────────────────────── -->
  <img
    v-else-if="n.type === 'image'"
    class="pb-image"
    :src="resolveAsset(n.assetId)"
    :alt="n.alt ?? ''"
    :style="wrapperStyle"
  />
  </template>
</template>

<style scoped>
.pb-stack {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.pb-stack--row {
  flex-direction: row;
}

.pb-stack--row > * {
  min-width: 0;
  flex: 1;
}

.pb-stack--wrap {
  flex-wrap: wrap;
}

.pb-card-body {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.pb-section {
  display: block;
}

.pb-section__title {
  margin: 0 0 var(--coar-spacing-s, 8px);
  font-size: var(--coar-body-base-size, 14px);
  font-weight: 600;
  color: var(--coar-text-neutral-primary, #111);
}

.pb-section__body {
  display: flex;
  flex-direction: column;
}

.pb-heading {
  margin: 0;
  font-weight: 600;
  color: var(--coar-text-neutral-primary, #111);
}

.pb-paragraph {
  margin: 0;
  color: var(--coar-text-neutral-secondary, #666);
}

/*
 * Inline-natured leaves (button, link, image) would otherwise be stretched to
 * the full cross-axis by `align-items: stretch` (the flexbox default) on the
 * parent stack — matching the editor canvas where these elements sit content-
 * sized inside a wrapper. Explicit `style.width` on the schema still wins
 * because it's applied as an inline style.
 */
.pb-button,
.pb-link,
.pb-image {
  width: fit-content;
  max-width: 100%;
}

.pb-link {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: var(--coar-text-accent, #0066cc);
  font-size: inherit;
  text-decoration: underline;
}

.pb-link:hover {
  color: var(--coar-text-accent-hover, #004fa3);
}

.pb-image {
  display: block;
}

.pb-spacer {
  flex-shrink: 0;
}
</style>
