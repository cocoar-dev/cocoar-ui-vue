<script setup lang="ts">
const props = defineProps<{
  todoId: string;
  close: (result?: unknown) => void;
}>();
</script>

<template>
  <div style="padding: 16px;">
    <h3>Todo Detail: {{ todoId }}</h3>
    <p>This modal was opened via URL fragment <code>#{{ todoId }}</code></p>
    <p>Try copying the URL and pasting it in a new tab — the modal should open automatically (deep-linking).</p>
    <p>Press browser Back to close this modal.</p>
  </div>
</template>
