<script setup lang="ts">
import { computed } from 'vue';
import { CoarTextInput } from '@cocoar/vue-ui';
import type { CoarValueControlProps } from '../types';

const props = withDefaults(
  defineProps<CoarValueControlProps<string> & { rows?: number; inputType?: 'text' | 'email'; swatch?: boolean }>(),
  { rows: 1, inputType: 'text', swatch: false, locale: undefined },
);
const emit = defineEmits<{ 'update:modelValue': [value: string | undefined] }>();
const text = computed({
  get: () => (typeof props.modelValue === 'string' ? props.modelValue : ''),
  set: (value: string) => emit('update:modelValue', value),
});
</script>

<template>
  <CoarTextInput
    :id="id"
    v-model="text"
    size="s"
    appearance="inline"
    :width="rows > 1 ? 'fill' : 'content'"
    :rows="rows"
    :type="inputType"
    placeholder="–"
    :readonly="readonly"
    :error="error"
    :aria-label="label"
  >
    <template v-if="swatch && text" #prefix>
      <span class="coar-object-editor-swatch" :style="{ background: text }" aria-hidden="true"></span>
    </template>
  </CoarTextInput>
</template>
