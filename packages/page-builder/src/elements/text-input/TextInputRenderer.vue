<script setup lang="ts">
import { computed } from 'vue';
import { CoarFormField, CoarPasswordInput, CoarTextInput } from '@cocoar/vue-ui';
import type { TextInputNode } from '../../schema';
import { usePageElement } from '../usePageElement';

const props = defineProps<{ node: TextInputNode }>();

const ctx = usePageElement();
const name = computed(() => props.node.name);

function htmlInputType(t?: string): 'text' | 'email' | 'url' {
  return t === 'email' || t === 'url' ? t : 'text';
}

function autocompleteFor(t?: string): string | undefined {
  return t === 'email' ? 'email' : t === 'url' ? 'url' : undefined;
}
</script>

<template>
  <CoarFormField
    :label="node.props.label"
    :required="node.validation?.required"
    :error="name ? ctx.getError(name) : ''"
    :disabled="node.props.disabled"
  >
    <CoarPasswordInput
      v-if="node.props.inputType === 'password'"
      :model-value="name ? (ctx.getValue(name) as string ?? '') : ''"
      :placeholder="node.props.placeholder"
      :disabled="node.props.disabled"
      @update:model-value="(v) => name && ctx.setValue(name, v)"
      @blurred="name && ctx.markTouched(name)"
    />
    <CoarTextInput
      v-else
      :model-value="name ? (ctx.getValue(name) as string ?? '') : ''"
      :type="htmlInputType(node.props.inputType)"
      :autocomplete="autocompleteFor(node.props.inputType)"
      :rows="node.props.rows"
      :placeholder="node.props.placeholder"
      :disabled="node.props.disabled"
      @update:model-value="(v) => name && ctx.setValue(name, v)"
      @blurred="name && ctx.markTouched(name)"
    />
  </CoarFormField>
</template>
