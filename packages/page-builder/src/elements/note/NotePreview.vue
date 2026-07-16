<script setup lang="ts">
import { CoarNote } from '@cocoar/vue-ui';
import type { NoteNode } from '../../schema';

const props = defineProps<{
  node: NoteNode;
  resolveAsset?: (id: string) => string;
}>();
</script>

<template>
  <CoarNote :variant="props.node.props?.variant">
    {{ props.node.props?.text || 'Note text.' }}
  </CoarNote>
</template>
