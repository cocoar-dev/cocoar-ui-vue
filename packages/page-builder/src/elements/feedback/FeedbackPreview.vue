<script setup lang="ts">
import { CoarNote } from '@cocoar/vue-ui'
import type { FeedbackNode } from '../../schema'
defineProps<{ node: FeedbackNode }>()
</script>
<template>
  <CoarNote :variant="node.props.kind === 'success' ? 'success' : node.props.kind === 'info' || node.props.kind === 'loading' ? 'info' : 'error'">
    {{ node.props.text || (node.props.kind === 'form-error' ? 'Action errors appear here' : 'Feedback message') }}
  </CoarNote>
</template>
