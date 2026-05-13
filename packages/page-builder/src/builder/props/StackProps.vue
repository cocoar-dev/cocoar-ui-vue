<script setup lang="ts">
import { CoarCheckbox } from '@cocoar/vue-ui';
import type { StackNode } from '../../schema';

const props = defineProps<{
  node: StackNode;
  patch: (update: Partial<StackNode>) => void;
}>();
</script>

<template>
  <div class="pb-prop-group">
    <span class="pb-prop-label">Direction</span>
    <div class="pb-prop-seg" role="radiogroup" aria-label="Stack direction">
      <button
        type="button"
        class="pb-prop-seg__btn"
        :class="{ 'pb-prop-seg__btn--active': (props.node.direction ?? 'column') === 'column' }"
        role="radio"
        :aria-checked="(props.node.direction ?? 'column') === 'column'"
        @click="props.patch({ direction: 'column' })"
      >
        ↓ Column
      </button>
      <button
        type="button"
        class="pb-prop-seg__btn"
        :class="{ 'pb-prop-seg__btn--active': props.node.direction === 'row' }"
        role="radio"
        :aria-checked="props.node.direction === 'row'"
        @click="props.patch({ direction: 'row' })"
      >
        → Row
      </button>
    </div>
  </div>
  <CoarCheckbox
    v-if="props.node.direction === 'row'"
    :model-value="!!props.node.wrap"
    label="Wrap children"
    @update:model-value="(v) => props.patch({ wrap: v })"
  />
</template>

<style scoped>
.pb-prop-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pb-prop-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--coar-text-neutral-primary, #111);
}

.pb-prop-seg {
  display: inline-flex;
  border: 1px solid var(--coar-border-neutral, #d0d0d0);
  border-radius: 6px;
  overflow: hidden;
  background: var(--coar-surface-base, #fff);
}

.pb-prop-seg__btn {
  flex: 1;
  padding: 6px 12px;
  border: none;
  background: transparent;
  color: var(--coar-text-neutral-secondary, #555);
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.12s, color 0.12s;
}

.pb-prop-seg__btn + .pb-prop-seg__btn {
  border-left: 1px solid var(--coar-border-neutral, #d0d0d0);
}

.pb-prop-seg__btn:hover:not(.pb-prop-seg__btn--active) {
  background: var(--coar-surface-neutral-subtle, #f0f0f2);
}

.pb-prop-seg__btn--active {
  background: var(--coar-surface-accent-subtle, #e6eefa);
  color: var(--coar-text-accent, #1666cc);
  font-weight: 600;
}
</style>
