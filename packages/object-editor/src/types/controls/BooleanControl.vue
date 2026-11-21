<script setup lang="ts">
import { computed } from 'vue';
import { CoarSwitch } from '@cocoar/vue-ui';
import { useI18n } from '@cocoar/vue-localization';
import type { CoarValueControlProps } from '../types';

const props = withDefaults(defineProps<CoarValueControlProps<boolean>>(), { locale: undefined });
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();
const { t } = useI18n();
const on = computed({
  get: () => props.modelValue === true,
  set: (value: boolean) => emit('update:modelValue', value),
});
</script>

<template>
  <CoarSwitch
    :id="id"
    v-model="on"
    class="coar-object-editor-switch"
    size="s"
    :readonly="readonly"
    :error="error"
    :aria-label="label"
    :label="on ? t('coar.objectEditor.yes', undefined, 'Yes') : t('coar.objectEditor.no', undefined, 'No')"
  />
</template>
