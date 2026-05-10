<template>
  <select
    ref="selectRef"
    v-model="value"
    style="width: 100%; height: 100%; padding: 0 8px; border: none; outline: 2px solid var(--coar-border-accent-strong); background: var(--coar-surface-neutral-base); font: inherit; color: inherit;"
  >
    <option v-for="opt in options" :key="opt" :value="opt">{{ opt }}</option>
  </select>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { ICellEditorParams } from 'ag-grid-community';

interface Config {
  options: string[];
}

const props = defineProps<{
  params: ICellEditorParams<unknown, string> & { config: Config };
}>();

const selectRef = ref<HTMLSelectElement | null>(null);
const value = ref<string>(props.params.value ?? '');
const options = props.params.config.options;

onMounted(() => {
  selectRef.value?.focus();
});

defineExpose({
  getValue: () => value.value,
});
</script>
