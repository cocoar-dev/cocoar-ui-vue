<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@cocoar/vue-localization';
import { CoarSelect } from '@cocoar/vue-ui';
import { toSelectOptions } from '../optionUtils';
import type { RadioGroupNode } from '../../schema';

const componentProps = defineProps<{
  modelValue: unknown;
  props: RadioGroupNode['props'];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: unknown];
}>();

const { t } = useI18n();

const choices = computed(() => toSelectOptions(componentProps.props.options));
</script>

<template>
  <CoarSelect
size="s"
    :model-value="(componentProps.modelValue as string | undefined) ?? null"
    :options="choices"
    :placeholder="t('coar.pageBuilder.props.none', undefined, '— none')"
    clearable
    @update:model-value="(v) => emit('update:modelValue', (v as string | null) ?? undefined)"
  />
</template>
