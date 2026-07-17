<script setup lang="ts">
import { useI18n } from '@cocoar/vue-localization';
import { CoarCheckbox } from '@cocoar/vue-ui';
import type { CheckboxNode } from '../../schema';

const props = defineProps<{
  modelValue: unknown;
  props: CheckboxNode['props'];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: unknown];
}>();

const { t } = useI18n();
</script>

<template>
  <CoarCheckbox
    :model-value="!!props.modelValue"
    :label="t('coar.pageBuilder.props.checkedByDefault', undefined, 'Checked by default')"
    @update:model-value="(v) => emit('update:modelValue', v || undefined)"
  />
</template>
