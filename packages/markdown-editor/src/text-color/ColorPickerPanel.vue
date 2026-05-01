<script setup lang="ts">
/**
 * Picker panel rendered inside an overlay (`menuPreset`). Receives the
 * currently active color and a `pick` callback as inputs — the parent
 * (CoarMarkdownEditor) opens the overlay via the shared overlay service,
 * which handles positioning, viewport flipping, scroll-reposition, and
 * outside-click + escape dismissal. No manual layout math here.
 */
import { ref } from 'vue';
import { CoarIcon } from '@cocoar/vue-ui';
import { COAR_TEXT_COLOR_PALETTE } from './index';

const props = defineProps<{
  /** Sanitized color currently active at the selection, or null. */
  currentColor: string | null;
  /** Callback invoked with `null` to clear, or a hex/css color string to apply. */
  pick: (color: string | null) => void;
}>();

const customValue = ref(props.currentColor ?? '#000000');
</script>

<template>
  <div
    class="coar-md-color-picker"
    role="menu"
    @mousedown.stop
  >
    <div class="coar-md-color-grid">
      <button
        v-for="swatch in COAR_TEXT_COLOR_PALETTE"
        :key="swatch.value || 'default'"
        type="button"
        :class="[
          'coar-md-color-swatch',
          swatch.value === '' ? 'coar-md-color-swatch--clear' : '',
          (swatch.value !== '' && currentColor === swatch.value)
            ? 'coar-md-color-swatch--active'
            : '',
        ]"
        :style="swatch.value ? { '--coar-md-swatch': swatch.value } : undefined"
        :title="swatch.name"
        :aria-label="swatch.name"
        @mousedown.prevent="pick(swatch.value === '' ? null : swatch.value)"
      >
        <CoarIcon v-if="swatch.value === ''" name="ban" size="s" />
      </button>
    </div>
    <div class="coar-md-color-custom">
      <label class="coar-md-color-custom-label" for="coar-md-color-custom-input">
        Custom
      </label>
      <input
        id="coar-md-color-custom-input"
        v-model="customValue"
        type="color"
        class="coar-md-color-custom-input"
        @change="pick(customValue)"
      />
    </div>
  </div>
</template>

<style>
/* Styles intentionally global so they live in the same stylesheet as the
   rest of the editor chrome — the overlay teleports the panel to body and
   scoped styles wouldn't apply across that boundary. */
.coar-md-color-picker {
  width: 224px;
  display: flex;
  flex-direction: column;
  gap: var(--coar-spacing-s);
  padding: var(--coar-spacing-s);
  background: var(--coar-background-neutral-primary);
  border: 1px solid var(--coar-border-neutral);
  border-radius: var(--coar-radius-xl);
  box-shadow: var(--coar-shadow-m, 0 4px 12px rgba(0, 0, 0, 0.12));
}

.coar-md-color-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
}

.coar-md-color-swatch {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  aspect-ratio: 1 / 1;
  padding: 0;
  border: 1px solid var(--coar-border-neutral);
  border-radius: var(--coar-radius-s);
  background: var(--coar-md-swatch, transparent);
  color: var(--coar-text-neutral-secondary);
  cursor: pointer;
  transition: transform 0.08s ease-out;
}
.coar-md-color-swatch:hover { transform: scale(1.08); }
.coar-md-color-swatch--active {
  outline: 2px solid var(--coar-text-accent-primary);
  outline-offset: 1px;
}
.coar-md-color-swatch--clear { background: var(--coar-background-neutral-secondary); }

.coar-md-color-custom {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-s);
  padding-top: var(--coar-spacing-xs);
  border-top: 1px solid var(--coar-border-neutral);
}
.coar-md-color-custom-label {
  font-size: 12px;
  color: var(--coar-text-neutral-secondary);
  flex-shrink: 0;
}
.coar-md-color-custom-input {
  flex: 1;
  height: 28px;
  padding: 0;
  border: 1px solid var(--coar-border-neutral);
  border-radius: var(--coar-radius-s);
  background: transparent;
  cursor: pointer;
}
.coar-md-color-custom-input::-webkit-color-swatch-wrapper { padding: 2px; }
.coar-md-color-custom-input::-webkit-color-swatch { border: none; border-radius: 2px; }
</style>
