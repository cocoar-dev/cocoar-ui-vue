<script setup lang="ts">
import RatingStars from './RatingStars.vue';
import type { RatingProps } from './ratingProps';

defineProps<{
  modelValue: unknown;
  props: RatingProps;
}>();

const emit = defineEmits<{ 'update:modelValue': [value: unknown] }>();
</script>

<template>
  <RatingStars
    :model-value="Number(modelValue ?? 0)"
    :max="props.max"
    @update:model-value="(v) => emit('update:modelValue', v || undefined)"
  />
</template>
