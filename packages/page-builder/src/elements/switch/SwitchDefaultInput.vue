<script setup lang="ts">
import { useI18n } from '@cocoar/vue-localization';
import { CoarSwitch } from '@cocoar/vue-ui';
import type { SwitchNode } from '../../schema';

const props = defineProps<{
  modelValue: unknown;
  props: SwitchNode['props'];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: unknown];
}>();

const { t } = useI18n();
</script>

<template>
  <CoarSwitch size="s"
    :model-value="!!props.modelValue"
    :label="t('coar.pageBuilder.props.onByDefault', undefined, 'On by default')"
    @update:model-value="(v) => emit('update:modelValue', v || undefined)"
  />
</template>
