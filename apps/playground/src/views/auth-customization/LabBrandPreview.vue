<template>
  <div class="preview" aria-hidden="true">
    <span>M</span>
    <strong>Runtime branding</strong>
  </div>
</template>

<style scoped>
.preview {
  display: grid;
  justify-items: center;
  gap: 0.35rem;
  padding: 0.5rem;
}

.preview span {
  display: grid;
  width: 2.5rem;
  height: 2.5rem;
  place-items: center;
  border-radius: 0.75rem;
  background: var(--coar-background-accent-primary, #1666cc);
  color: white;
}
</style>
