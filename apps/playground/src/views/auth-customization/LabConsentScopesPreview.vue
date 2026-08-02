<template>
  <div class="preview">
    <strong>Runtime consent scopes[]</strong>
    <span>Required scope</span>
    <span>Optional scope</span>
    <small>Repeats from host data; current workaround for missing array binding.</small>
  </div>
</template>

<style scoped>
.preview {
  display: grid;
  gap: 0.35rem;
  padding: 0.6rem;
  border: 1px dashed var(--coar-border-neutral, #d5d8df);
  border-radius: 0.4rem;
  font-size: 0.75rem;
}
.preview span {
  padding: 0.3rem;
  border: 1px solid var(--coar-border-neutral, #dfe1e7);
}
.preview small {
  color: var(--coar-text-neutral-secondary, #626773);
}
</style>
