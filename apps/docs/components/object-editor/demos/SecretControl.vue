<template>
  <CoarTextInput
    :id="id"
    v-model="typed"
    size="s"
    appearance="inline"
    width="content"
    type="password"
    :placeholder="modelValue ? '•••••• (set; type to replace)' : 'not set'"
    :readonly="readonly"
    :aria-label="label"
    @change="replace"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarTextInput } from '@cocoar/vue-ui';

// Write-only: the stored value is never shown. A typed replacement is turned into an
// envelope when the field is left; leaving it empty keeps the stored value.
// (Demo only: a real app encrypts on its server; this base64 is not encryption.)
const props = defineProps<{ modelValue?: unknown; id: string; label: string; readonly: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: { $enc: string; data: string }] }>();
const typed = ref('');

function replace() {
  if (!typed.value || props.readonly) return;
  emit('update:modelValue', { $enc: 'demo', data: btoa(typed.value) });
  typed.value = '';
}
</script>
