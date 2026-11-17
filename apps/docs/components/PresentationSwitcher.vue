<script setup lang="ts">
import { useDocsPresentation, type DocsPresentation } from '../useDocsPresentation';

const { presentation, choosePresentation } = useDocsPresentation();
function choose(event: Event) {
  choosePresentation((event.target as HTMLSelectElement).value as DocsPresentation);
}
</script>

<template>
  <label class="docs-presentation" title="Compact is an experimental presentation">
    <span class="docs-presentation__label">Style</span>
    <select
      :value="presentation"
      aria-label="Documentation presentation"
      @change="choose"
    >
      <option value="legacy">Bisher</option>
      <option value="compact">Compact</option>
    </select>
  </label>
</template>

<style scoped>
.docs-presentation {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  color: inherit;
  font-family: inherit;
  font-size: 13px;
}
.docs-presentation select {
  min-width: 96px;
  min-height: 30px;
  padding: 2px 6px;
  border: 1px solid var(--coar-border-neutral-tertiary);
  border-radius: var(--coar-control-radius, 6px);
  background: var(--coar-background-neutral-primary);
  color: var(--coar-text-neutral-primary);
  font: inherit;
  cursor: pointer;
}
.docs-presentation select:focus-visible {
  outline: 2px solid var(--coar-focus-color, var(--coar-text-accent-primary));
  outline-offset: 2px;
}
.VPNavBar .docs-presentation {
  margin-left: 8px;
}
.VPNavBar .docs-presentation__label {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
}
.VPNavScreen .docs-presentation {
  display: flex;
  justify-content: space-between;
  margin-top: 24px;
}
.VPNavScreen .docs-presentation select {
  min-height: 44px;
  font-size: 16px;
}
@media (max-width: 1279px) {
  .VPNavBar .docs-presentation {
    display: none;
  }
}
@media (max-width: 767px) {
  .docs-presentation select {
    min-height: 44px;
    font-size: 16px;
  }
}
</style>
