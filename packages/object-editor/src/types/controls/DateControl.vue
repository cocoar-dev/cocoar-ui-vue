<script setup lang="ts">
import { computed, ref } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import { useI18n } from '@cocoar/vue-localization';
import { CoarPlainDatePicker } from '@cocoar/vue-ui';
import type { CoarValueControlProps } from '../types';

const props = withDefaults(defineProps<CoarValueControlProps<string>>(), { locale: undefined });
const emit = defineEmits<{ 'update:modelValue': [value: string | undefined] }>();
const { t } = useI18n();
const refused = ref(false);
const date = computed({
  get: () => {
    try {
      return props.modelValue ? Temporal.PlainDate.from(props.modelValue) : null;
    } catch {
      return null;
    }
  },
  set: (value: Temporal.PlainDate | null) => emit('update:modelValue', value?.toString()),
});
</script>

<template>
  <CoarPlainDatePicker
    :id="id"
    v-model="date"
    size="s"
    appearance="inline"
    width="content"
    :locale="locale"
    close-on-select
    :readonly="readonly"
    :error="error"
    :aria-label="label"
    @entry-refused="refused = $event"
  />
  <span v-if="refused" class="coar-object-editor-error" role="alert">{{
    t('coar.objectEditor.invalidDate', undefined, 'Not a date: the value is unchanged. Esc restores it.')
  }}</span>
</template>
