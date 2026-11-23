<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from '@cocoar/vue-localization';
import { CoarNumberInput } from '@cocoar/vue-ui';
import { numberScale } from '../../core/schema';
import type { CoarValueControlProps } from '../types';

const props = withDefaults(defineProps<CoarValueControlProps<number>>(), { locale: undefined });
const emit = defineEmits<{ 'update:modelValue': [value: number | undefined] }>();
const { t } = useI18n();
const number = computed({
  get: () => (typeof props.modelValue === 'number' ? props.modelValue : null),
  set: (value: number | null) => emit('update:modelValue', value ?? undefined),
});
const decimals = computed(() => numberScale(props.schema) ?? null);
const refused = ref(false);
const refusal = computed(() =>
  decimals.value === null
    ? t('coar.objectEditor.invalidNumber', undefined, 'Enter a number with one decimal separator, without thousands separators.')
    : t(
        'coar.objectEditor.invalidNumberScale',
        { count: decimals.value },
        'Enter a number with at most {count} decimal places, without thousands separators.',
      ).replace('{count}', String(decimals.value)),
);
</script>

<template>
  <CoarNumberInput
    :id="id"
    v-model="number"
    exact
    size="s"
    appearance="inline"
    width="content"
    :min="schema.minimum"
    :max="schema.maximum"
    :decimals="decimals"
    :suffix="schema['x-coar-unit']"
    :locale="locale"
    placeholder="–"
    :readonly="readonly"
    :error="error"
    :aria-label="label"
    @entry-refused="refused = $event"
  />
  <span v-if="refused" class="coar-object-editor-error" role="alert">{{ refusal }}</span>
</template>
