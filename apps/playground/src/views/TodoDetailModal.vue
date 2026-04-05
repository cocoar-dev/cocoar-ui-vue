<script setup lang="ts">
const props = defineProps<{
  todoId: string;
  close: (result?: unknown) => void;
}>();
</script>

<template>
  <div class="todo-modal">
    <h2>Custom Modal: {{ todoId }}</h2>
    <p>This is a <strong>raw overlay</strong> (<code>type: 'modal'</code>) — no dialog shell, full control over layout.</p>
    <p>Fragment: <code>#modal/{{ todoId }}</code></p>
    <button class="todo-modal__close" @click="close()">Close</button>
  </div>
</template>

<style>
.todo-modal {
  background: var(--coar-surface-default, #fff);
  border-radius: 12px;
  padding: 32px;
  max-width: 500px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}

.todo-modal__close {
  margin-top: 16px;
  padding: 8px 16px;
  border: 1px solid var(--coar-border-neutral, #ccc);
  border-radius: 6px;
  background: var(--coar-surface-default, #fff);
  cursor: pointer;
}

.todo-modal__close:hover {
  background: var(--coar-surface-neutral-hover, #f5f5f5);
}
</style>
