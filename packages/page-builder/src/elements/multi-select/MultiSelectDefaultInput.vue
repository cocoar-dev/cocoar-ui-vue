<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@cocoar/vue-localization';
import { CoarMultiSelect } from '@cocoar/vue-ui';
import { toSelectOptions } from '../optionUtils';
import type { MultiSelectNode } from '../../schema';

const componentProps = defineProps<{
  modelValue: unknown;
  props: MultiSelectNode['props'];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: unknown];
}>();

const { t } = useI18n();

const choices = computed(() => toSelectOptions(componentProps.props.options));
</script>

<template>
  <CoarMultiSelect
    :model-value="(componentProps.modelValue as string[] | undefined) ?? []"
    :options="choices"
    :placeholder="t('coar.pageBuilder.props.none', undefined, '— none')"
    clearable
    @update:model-value="(v) => emit('update:modelValue', (v as string[]).length > 0 ? v : undefined)"
  />
</template>
