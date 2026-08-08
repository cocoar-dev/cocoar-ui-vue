<script setup lang="ts">
import { computed, inject } from 'vue';
import { CoarFormField } from '@cocoar/vue-ui';
import type { ElementNode, PropertyBinding } from '../schema';
import { isExpressionBinding, isExpressionBindingEnabled } from '../runtimeBindings';
import { BUILDER_LOGIC } from './builderContext';
import { expressionLiteral } from './expressionAuthoring';

const props = defineProps<{
  node: ElementNode;
  target: string;
  label: string;
  staticValue?: unknown;
  patch: (update: { bindings?: Record<string, PropertyBinding> }) => void;
}>();

const logic = inject(BUILDER_LOGIC);
const binding = computed(() => props.node.bindings?.[props.target]);
const expressionBinding = computed(() => {
  const value = binding.value;
  return value && isExpressionBinding(value) ? value : null;
});
const active = computed(() => !!expressionBinding.value && isExpressionBindingEnabled(expressionBinding.value));
const expression = computed(() => {
  const value = binding.value;
  return value && isExpressionBinding(value) ? value.expression : '';
});

function useStatic() {
  if (!active.value) return;
  const next = { ...(props.node.bindings ?? {}) };
  next[props.target] = { ...expressionBinding.value!, enabled: false };
  props.patch({ bindings: next });
}

function useExpression() {
  if (active.value) return;
  const next = { ...(props.node.bindings ?? {}) };
  next[props.target] = expressionBinding.value
    ? { ...expressionBinding.value, enabled: true }
    : {
        source: 'expression',
        enabled: true,
        expression: expressionLiteral(props.staticValue),
      };
  props.patch({ bindings: next });
}

function edit() {
  logic?.openBinding(props.node.id, props.target);
}

function toggleMode() {
  if (active.value) useStatic();
  else useExpression();
}
</script>

<template>
  <div class="pb-bindable-property">
    <CoarFormField :label="label">
      <template #label-action>
        <button
          type="button"
          class="pb-bindable-property__mode"
          :class="{ 'pb-bindable-property__mode--active': active }"
          role="switch"
          :aria-checked="active"
          :aria-label="active ? `Use static value for ${label}` : `Use expression for ${label}`"
          :title="active ? 'Expression active — switch to static value' : 'Static value active — switch to expression'"
          @click="toggleMode"
        >
          <span>fx</span>
        </button>
      </template>

      <div class="pb-bindable-property__control">
        <div
          class="pb-bindable-property__static"
          :class="{ 'pb-bindable-property__static--covered': active }"
          :aria-hidden="active"
        >
          <slot />
        </div>
        <button
          v-if="active"
          type="button"
          class="pb-bindable-property__expression"
          :title="expression"
          @click="edit"
        >
          <code>{{ expression }}</code>
          <span>Edit…</span>
        </button>
      </div>
    </CoarFormField>
  </div>
</template>

<style scoped>
.pb-bindable-property { display: flex; flex-direction: column; gap: 7px; }
.pb-bindable-property__mode {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 20px;
  padding: 0;
  border: 0;
  border-radius: 2px;
  background: transparent;
  color: var(--coar-text-neutral-tertiary, #777);
  cursor: pointer;
}
.pb-bindable-property__mode span { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 11px; font-style: italic; font-weight: 700; line-height: 1; }
.pb-bindable-property__mode:not(.pb-bindable-property__mode--active)::after { position: absolute; width: 20px; height: 1.5px; border-radius: 1px; background: currentColor; content: ''; transform: rotate(-42deg); }
.pb-bindable-property__mode--active { color: var(--coar-text-accent-primary, #1666cc); }
.pb-bindable-property__mode:hover { color: var(--coar-text-accent-primary, #1666cc); }
.pb-bindable-property__mode:focus-visible { outline: 2px solid var(--coar-focus-color, #1666cc); outline-offset: 2px; }
.pb-bindable-property__control { position: relative; min-width: 0; }
.pb-bindable-property__static--covered { visibility: hidden; pointer-events: none; }
.pb-bindable-property__expression { position: absolute; inset: 0; display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; box-sizing: border-box; min-width: 0; min-height: 0; padding: 7px 9px; overflow: hidden; border: 1px solid var(--coar-border-accent-primary, #1666cc); border-radius: 5px; background: var(--coar-surface-accent-secondary, #eef4ff); color: var(--coar-text-accent-primary, #1666cc); cursor: pointer; text-align: left; }
.pb-bindable-property__expression code { display: -webkit-box; overflow: hidden; color: inherit; font-size: 11px; overflow-wrap: anywhere; white-space: pre-wrap; -webkit-box-orient: vertical; -webkit-line-clamp: 6; }
.pb-bindable-property__expression span { flex: none; font-size: 11px; font-weight: 600; }
.pb-bindable-property__expression:hover {
  background: var(--coar-surface-accent-secondary, #e6eefa);
  color: var(--coar-text-accent-primary, #1666cc);
}
</style>
