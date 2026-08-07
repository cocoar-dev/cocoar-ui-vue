<script setup lang="ts">
import { useI18n } from '@cocoar/vue-localization';
import { CoarCheckbox } from '@cocoar/vue-ui';
import type { StackNode } from '../../schema';

const props = defineProps<{
  node: StackNode;
  patch: (update: Partial<StackNode>) => void;
}>();

const { t } = useI18n();
</script>

<template>
  <div class="pb-prop-group">
    <span class="pb-prop-label">{{ t('coar.pageBuilder.props.direction', undefined, 'Direction') }}</span>
    <div class="pb-prop-seg" role="radiogroup" :aria-label="t('coar.pageBuilder.props.stackDirection', undefined, 'Stack direction')">
      <button
        type="button"
        class="pb-prop-seg__btn"
        :class="{ 'pb-prop-seg__btn--active': (props.node.props.direction ?? 'column') === 'column' }"
        role="radio"
        :aria-checked="(props.node.props.direction ?? 'column') === 'column'"
        @click="props.patch({ props: { direction: 'column' } })"
      >
        ↓ {{ t('coar.pageBuilder.props.column', undefined, 'Column') }}
      </button>
      <button
        type="button"
        class="pb-prop-seg__btn"
        :class="{ 'pb-prop-seg__btn--active': props.node.props.direction === 'row' }"
        role="radio"
        :aria-checked="props.node.props.direction === 'row'"
        @click="props.patch({ props: { direction: 'row' } })"
      >
        → {{ t('coar.pageBuilder.props.row', undefined, 'Row') }}
      </button>
    </div>
  </div>
  <CoarCheckbox size="s"
    v-if="props.node.props.direction === 'row'"
    :model-value="!!props.node.props.wrap"
    :label="t('coar.pageBuilder.props.wrapChildren', undefined, 'Wrap children')"
    @update:model-value="(v) => props.patch({ props: { wrap: v } })"
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
  background: var(--coar-background-neutral-primary, #fff);
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
  background: var(--coar-background-neutral-secondary, #f0f0f2);
}

.pb-prop-seg__btn--active {
  background: var(--coar-surface-accent-secondary, #e6eefa);
  color: var(--coar-text-accent-primary, #1666cc);
  font-weight: 600;
}
</style>
