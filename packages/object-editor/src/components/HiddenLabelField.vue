<script setup lang="ts">
import { CoarFormField } from '@cocoar/vue-ui';

// The inputs of @cocoar/vue-ui are named through CoarFormField. Where the layout
// shows no label, this gives them one for screen readers.
defineProps<{ id: string; label: string; error?: string }>();
</script>

<template>
  <CoarFormField :id="id" :error="error">
    <label :id="`${id}-label`" class="coar-object-editor-sr-only" :for="id">{{ label }}</label>
    <slot />
  </CoarFormField>
</template>
