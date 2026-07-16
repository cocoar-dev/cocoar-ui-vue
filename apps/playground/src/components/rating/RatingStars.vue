<script setup lang="ts">
const props = defineProps<{
  modelValue: number;
  max: number;
  readonly?: boolean;
}>();

const emit = defineEmits<{ 'update:modelValue': [value: number] }>();

// Tapping the current value clears it — lets a demo user un-rate, which also
// exercises the element's required gating (0 counts as empty).
function setValue(i: number) {
  if (props.readonly) return;
  emit('update:modelValue', i === props.modelValue ? 0 : i);
}
</script>

<template>
  <div class="rating-stars" role="radiogroup">
    <button
      v-for="i in max"
      :key="i"
      type="button"
      class="rating-stars__star"
      :class="{ 'rating-stars__star--on': i <= modelValue }"
      :disabled="readonly"
      :aria-label="`${i} / ${max}`"
      @click="setValue(i)"
    >
      ★
    </button>
  </div>
</template>

<style scoped>
.rating-stars {
  display: inline-flex;
  gap: 2px;
}

.rating-stars__star {
  background: none;
  border: none;
  padding: 2px;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  color: var(--coar-border-neutral, #d0d0d6);
  transition: color 0.1s ease-out, transform 0.08s ease-out;
}

.rating-stars__star:disabled { cursor: default; }
.rating-stars__star:not(:disabled):hover { transform: scale(1.15); }
.rating-stars__star--on { color: #f59e0b; }
</style>
