<script setup lang="ts">
import { computed } from 'vue'
import { CoarNote } from '@cocoar/vue-ui'
import type { FeedbackNode } from '../../schema'
import { usePageElement } from '../usePageElement'

const props = defineProps<{ node: FeedbackNode }>()
const ctx = usePageElement()
const kind = computed(() => props.node.props.kind ?? 'form-error')
const text = computed(() => kind.value === 'form-error' ? ctx.formError.value : (props.node.props.text ?? ''))
const visible = computed(() => kind.value === 'loading'
  ? ctx.isSubmitting.value || ctx.isValidating.value
  : text.value.length > 0)
const variant = computed(() => {
  if (kind.value === 'form-error' || kind.value === 'error') return 'error'
  if (kind.value === 'success') return 'success'
  return 'info'
})
</script>

<template>
  <div v-if="visible" class="pb-feedback" :role="variant === 'error' ? 'alert' : 'status'" :aria-live="variant === 'error' ? 'assertive' : 'polite'">
    <CoarNote :variant="variant">
      {{ kind === 'loading' ? (node.props.text || 'Loading…') : text }}
    </CoarNote>
  </div>
</template>

<style scoped>
.pb-feedback { min-width: 0; }
</style>
