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
import {
  CoarButton,
  CoarCard,
  CoarCheckbox,
  CoarDivider,
  CoarFormField,
  CoarMultiSelect,
  CoarNote,
  CoarNumberInput,
  CoarOtpInput,
  CoarPasswordInput,
  CoarPlainDatePicker,
  CoarPlainDateTimePicker,
  CoarRadioButton,
  CoarRadioGroup,
  CoarSelect,
  CoarSwitch,
  CoarTextInput,
  type CoarSelectOption,
} from '@cocoar/vue-ui';
import { isElementAllowed, type PageNode } from './schema';
import { selfStyle, containerLayoutStyle as layoutStyleFromStyle } from './styleMapping';
import { headingTag, isoToPlainDate, isoToPlainDateTime } from './renderSafety';
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
// Mapping lives in styleMapping.ts (pure, unit-tested). `wrapperStyle` is the
// node's own outer style; `containerLayoutStyle` arranges a container's children.

// Direction-aware sizing: read the parent container's direction, and tell our
// own children what direction WE impose on them.
const parentDirection = inject(PB_PARENT_DIRECTION, undefined);
const ownDirection = computed<FlexDirection>(() =>
  props.node.type === 'stack' ? (props.node.direction ?? 'column') : 'column',
);
provide(PB_PARENT_DIRECTION, ownDirection);

const wrapperStyle = computed(() =>
  selfStyle(props.node.style, parentDirection?.value ?? 'column'),
);

function containerLayoutStyle(node: PageNode) {
  return layoutStyleFromStyle(node.style);
}

// ─── Narrowed typed views (templates can't narrow discriminated unions) ────────

const n = computed(() => props.node);

// Field name for named inputs as a plain `string | undefined`. Using this in
// handlers avoids vue-tsc losing the discriminated-union narrowing of `n` inside
// nested arrow/`&&` expressions (which surfaced as spurious "Property 'name'…").
const nodeName = computed(() => ('name' in props.node ? props.node.name : undefined));

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

// ─── Input type wiring ────────────────────────────────────────────────────────

function htmlInputType(t?: string): 'text' | 'email' | 'url' {
  return t === 'email' || t === 'url' ? t : 'text';
}

function autocompleteFor(t?: string): string | undefined {
  return t === 'email' ? 'email' : t === 'url' ? 'url' : undefined;
}

// Selects and checkboxes have no meaningful blur moment — choosing a value IS
// the interaction, so it marks the field touched (otherwise their errors could
// never surface between submits).
function setFieldValue(name: string | undefined, v: unknown) {
  if (!name) return;
  ctx!.setValue(name, v);
  ctx!.markTouched(name);
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
    :is="headingTag(n.level)"
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

  <!-- ── note ─────────────────────────────────────────────────────────────── -->
  <CoarNote
    v-else-if="n.type === 'note'"
    :variant="n.variant"
    :style="wrapperStyle"
  >
    {{ n.text }}
  </CoarNote>

  <!-- ── text-input ───────────────────────────────────────────────────────── -->
  <CoarFormField
    v-else-if="n.type === 'text-input'"
    :label="n.label"
    :required="n.validation?.required"
    :error="nodeName ? ctx.getError(nodeName) : ''"
    :disabled="n.disabled"
    :style="wrapperStyle"
  >
    <CoarPasswordInput
      v-if="n.inputType === 'password'"
      :model-value="nodeName ? (ctx.getValue(nodeName) as string ?? '') : ''"
      :placeholder="n.placeholder"
      :disabled="n.disabled"
      @update:model-value="(v) => nodeName && ctx.setValue(nodeName, v)"
      @blurred="nodeName && ctx.markTouched(nodeName)"
    />
    <CoarTextInput
      v-else
      :model-value="nodeName ? (ctx.getValue(nodeName) as string ?? '') : ''"
      :type="htmlInputType(n.inputType)"
      :autocomplete="autocompleteFor(n.inputType)"
      :rows="n.rows"
      :placeholder="n.placeholder"
      :disabled="n.disabled"
      @update:model-value="(v) => nodeName && ctx.setValue(nodeName, v)"
      @blurred="nodeName && ctx.markTouched(nodeName)"
    />
  </CoarFormField>

  <!-- ── number-input ─────────────────────────────────────────────────────── -->
  <CoarFormField
    v-else-if="n.type === 'number-input'"
    :label="n.label"
    :required="n.validation?.required"
    :error="nodeName ? ctx.getError(nodeName) : ''"
    :disabled="n.disabled"
    :style="wrapperStyle"
  >
    <CoarNumberInput
      :model-value="nodeName ? (ctx.getValue(nodeName) as number ?? null) : null"
      :placeholder="n.placeholder"
      :min="n.min"
      :max="n.max"
      :step="n.step"
      :decimals="n.decimals"
      :disabled="n.disabled"
      @update:model-value="(v) => nodeName && ctx.setValue(nodeName, v)"
      @blurred="nodeName && ctx.markTouched(nodeName)"
    />
  </CoarFormField>

  <!-- ── checkbox (FormField wrapper so its validation error can surface) ──── -->
  <CoarFormField
    v-else-if="n.type === 'checkbox'"
    :error="nodeName ? ctx.getError(nodeName) : ''"
    :disabled="n.disabled"
    :style="wrapperStyle"
  >
    <CoarCheckbox
      :model-value="nodeName ? (ctx.getValue(nodeName) as boolean ?? false) : false"
      :label="n.label"
      :required="n.validation?.required"
      :disabled="n.disabled"
      @update:model-value="(v) => setFieldValue(nodeName, v)"
    />
  </CoarFormField>

  <!-- ── switch (boolean like checkbox; touch-on-change) ─────────────────────── -->
  <CoarFormField
    v-else-if="n.type === 'switch'"
    :error="nodeName ? ctx.getError(nodeName) : ''"
    :disabled="n.disabled"
    :style="wrapperStyle"
  >
    <CoarSwitch
      :model-value="nodeName ? (ctx.getValue(nodeName) as boolean ?? false) : false"
      :label="n.label"
      :disabled="n.disabled"
      @update:model-value="(v) => setFieldValue(nodeName, v)"
    />
  </CoarFormField>

  <!-- ── radio-group ──────────────────────────────────────────────────────── -->
  <CoarFormField
    v-else-if="n.type === 'radio-group'"
    :label="n.label"
    :required="n.validation?.required"
    :error="nodeName ? ctx.getError(nodeName) : ''"
    :disabled="n.disabled"
    :style="wrapperStyle"
  >
    <CoarRadioGroup
      :model-value="nodeName ? (ctx.getValue(nodeName) as string ?? undefined) : undefined"
      :name="nodeName ?? n.id"
      :label="n.label"
      :orientation="n.orientation"
      :required="n.validation?.required"
      :disabled="n.disabled"
      @update:model-value="(v) => setFieldValue(nodeName, v)"
    >
      <CoarRadioButton
        v-for="o in n.options ?? []"
        :key="o.value"
        :value="o.value"
        :disabled="n.disabled"
      >
        {{ o.label }}
      </CoarRadioButton>
    </CoarRadioGroup>
  </CoarFormField>

  <!-- ── select ───────────────────────────────────────────────────────────── -->
  <CoarFormField
    v-else-if="n.type === 'select'"
    :label="n.label"
    :required="n.validation?.required"
    :error="nodeName ? ctx.getError(nodeName) : ''"
    :disabled="n.disabled"
    :style="wrapperStyle"
  >
    <CoarSelect
      :model-value="nodeName ? (ctx.getValue(nodeName) as string ?? null) : null"
      :options="toSelectOptions(n.options)"
      :placeholder="n.placeholder"
      :disabled="n.disabled"
      @update:model-value="(v) => setFieldValue(nodeName, v)"
    />
  </CoarFormField>

  <!-- ── multi-select ─────────────────────────────────────────────────────── -->
  <CoarFormField
    v-else-if="n.type === 'multi-select'"
    :label="n.label"
    :required="n.validation?.required"
    :error="nodeName ? ctx.getError(nodeName) : ''"
    :disabled="n.disabled"
    :style="wrapperStyle"
  >
    <CoarMultiSelect
      :model-value="nodeName ? (ctx.getValue(nodeName) as string[] ?? []) : []"
      :options="toSelectOptions(n.options)"
      :placeholder="n.placeholder"
      :disabled="n.disabled"
      @update:model-value="(v) => setFieldValue(nodeName, v)"
    />
  </CoarFormField>

  <!-- ── otp-input ────────────────────────────────────────────────────────── -->
  <CoarFormField
    v-else-if="n.type === 'otp-input'"
    :label="n.label"
    :required="n.validation?.required"
    :error="nodeName ? ctx.getError(nodeName) : ''"
    :disabled="n.disabled"
    :style="wrapperStyle"
  >
    <CoarOtpInput
      :model-value="nodeName ? (ctx.getValue(nodeName) as string ?? '') : ''"
      :length="n.length"
      :type="n.otpType"
      :mask="n.mask"
      :disabled="n.disabled"
      @update:model-value="(v) => nodeName && ctx.setValue(nodeName, v)"
      @blurred="nodeName && ctx.markTouched(nodeName)"
    />
  </CoarFormField>

  <!-- ── date-input (ISO string in the value model, Temporal at the picker) ── -->
  <CoarFormField
    v-else-if="n.type === 'date-input'"
    :label="n.label"
    :required="n.validation?.required"
    :error="nodeName ? ctx.getError(nodeName) : ''"
    :disabled="n.disabled"
    :style="wrapperStyle"
  >
    <CoarPlainDatePicker
      :model-value="nodeName ? isoToPlainDate(ctx.getValue(nodeName)) : null"
      :placeholder="n.placeholder"
      :disabled="n.disabled"
      clearable
      @update:model-value="(d) => setFieldValue(nodeName, d ? d.toString() : '')"
    />
  </CoarFormField>

  <!-- ── datetime-input ───────────────────────────────────────────────────── -->
  <CoarFormField
    v-else-if="n.type === 'datetime-input'"
    :label="n.label"
    :required="n.validation?.required"
    :error="nodeName ? ctx.getError(nodeName) : ''"
    :disabled="n.disabled"
    :style="wrapperStyle"
  >
    <CoarPlainDateTimePicker
      :model-value="nodeName ? isoToPlainDateTime(ctx.getValue(nodeName)) : null"
      :placeholder="n.placeholder"
      :disabled="n.disabled"
      clearable
      @update:model-value="(d) => setFieldValue(nodeName, d ? d.toString() : '')"
    />
  </CoarFormField>

  <!-- ── button ───────────────────────────────────────────────────────────── -->
  <!-- Validating buttons stay CLICKABLE while the form is invalid — the click
       reveals the errors (a disabled button can't explain itself). They only
       disable while an async onValidate is in flight, to block double-submit. -->
  <CoarButton
    v-else-if="n.type === 'button'"
    class="pb-button"
    :variant="n.variant ?? 'primary'"
    :size="n.size"
    :icon-left="n.icon"
    :disabled="n.validates && ctx.isValidating.value"
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

/*
 * Allow row children to shrink below their content size (prevents overflow of
 * long labels). Children are natural-width by default; growing to fill is opt-in
 * via the node's `size: 'fill'` (see styleMapping.ts), not forced here.
 */
.pb-stack--row > * {
  min-width: 0;
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
