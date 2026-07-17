<script setup lang="ts">
import { CoarNote } from '@cocoar/vue-ui';
import type { NoteNode } from '../../schema';

defineProps<{ node: NoteNode }>();
</script>

<template>
  <CoarNote :variant="node.props.variant">
    {{ node.props.text }}
  </CoarNote>
</template>
