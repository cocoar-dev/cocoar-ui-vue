<script setup lang="ts">
import { computed } from 'vue';

export type NoteVariant = 'neutral' | 'success' | 'warning' | 'error' | 'info' | 'accent';
export type NotePadding = 's' | 'm' | 'l';

export interface CoarNoteProps {
  /** Note semantic variant. Determines left border color and background tint. */
  variant?: NoteVariant;
  /** Note padding size. */
  padding?: NotePadding;
}

const props = withDefaults(defineProps<CoarNoteProps>(), {
  variant: 'neutral',
  padding: 'm',
});

const hostClasses = computed(() => [
  'coar-note',
  `coar-note--${props.variant}`,
  `coar-note--padding-${props.padding}`,
]);
</script>

<template>
  <div :class="hostClasses" role="note">
    <slot />
  </div>
</template>

<style scoped>
.coar-note {
  display: block;
  border-radius: 0 var(--coar-radius-xs) var(--coar-radius-xs) 0;
  border-left: 4px solid var(--coar-note-border-color);
  background-color: var(--coar-note-bg);
  transition: background-color var(--coar-duration-normal) var(--coar-ease-out), border-color var(--coar-duration-normal) var(--coar-ease-out);
}

/* Variants */
.coar-note--info    { --coar-note-bg: var(--coar-background-semantic-info-subtle);    --coar-note-border-color: var(--coar-border-semantic-info-bold); }
.coar-note--accent  { --coar-note-bg: var(--coar-background-accent-tertiary);         --coar-note-border-color: var(--coar-border-accent-primary); }
.coar-note--neutral { --coar-note-bg: var(--coar-background-neutral-secondary);       --coar-note-border-color: var(--coar-border-neutral-secondary); }
.coar-note--success { --coar-note-bg: var(--coar-background-semantic-success-subtle); --coar-note-border-color: var(--coar-border-semantic-success-bold); }
.coar-note--warning { --coar-note-bg: var(--coar-background-semantic-warning-subtle); --coar-note-border-color: var(--coar-border-semantic-warning-bold); }
.coar-note--error   { --coar-note-bg: var(--coar-background-semantic-error-subtle);   --coar-note-border-color: var(--coar-border-semantic-error-bold); }

/* Padding */
.coar-note--padding-s { padding: var(--coar-spacing-s) var(--coar-spacing-m); }
.coar-note--padding-m { padding: var(--coar-spacing-m) var(--coar-spacing-l); }
.coar-note--padding-l { padding: var(--coar-spacing-l) var(--coar-spacing-xl); }

/* Content resets */
.coar-note :deep(> :first-child) { margin-top: 0; }
.coar-note :deep(> :last-child)  { margin-bottom: 0; }

.coar-note :deep(ul),
.coar-note :deep(ol) {
  margin: var(--coar-spacing-s) 0;
  padding-left: var(--coar-spacing-l);
}

.coar-note :deep(li) {
  margin: var(--coar-spacing-xs) 0;
}
</style>
