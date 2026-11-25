<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { CoarTextInput } from '@cocoar/vue-ui';
import { useI18n } from '@cocoar/vue-localization';
import type { JsonValue } from '../../core/schema';
import type { CoarValueControlProps } from '../types';
import { useRefusal } from './useRefusal';

// Edits a value the schema does not describe as JSON text. The value changes only
// when the text is valid JSON and differs; anything else leaves it as it was.
const props = withDefaults(defineProps<CoarValueControlProps<JsonValue>>(), { locale: undefined });
const emit = defineEmits<{ 'update:modelValue': [value: JsonValue]; refused: [message: string | undefined] }>();
const { t } = useI18n();

const stored = computed(() => (props.modelValue === undefined ? '' : JSON.stringify(props.modelValue)));
const draft = ref(stored.value);
const invalid = ref(false);
useRefusal(
  emit,
  computed(() =>
    invalid.value
      ? t('coar.objectEditor.invalidJson', undefined, 'Not valid JSON: the value is unchanged. Esc restores it.')
      : undefined,
  ),
);
watch(stored, (text) => {
  draft.value = text;
  invalid.value = false;
});

function commit() {
  if (draft.value === stored.value) {
    invalid.value = false;
    return;
  }
  let parsed: JsonValue;
  try {
    parsed = JSON.parse(draft.value) as JsonValue;
  } catch {
    invalid.value = true;
    return;
  }
  invalid.value = false;
  emit('update:modelValue', parsed);
}

function cancel() {
  draft.value = stored.value;
  invalid.value = false;
}
</script>

<template>
  <CoarTextInput
    :id="id"
    v-model="draft"
    size="s"
    appearance="inline"
    width="fill"
    class="coar-object-editor-json"
    spellcheck="false"
    :readonly="readonly"
    :error="error || invalid"
    :aria-label="label"
    @blurred="commit"
    @keydown.enter.prevent="commit"
    @keydown.esc="cancel"
  />
</template>
