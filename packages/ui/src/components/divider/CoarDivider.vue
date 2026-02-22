<script setup lang="ts">
import { computed, useSlots } from 'vue';

export type DividerAlign = 'left' | 'center' | 'right';
export type DividerVariant = 'subtle' | 'strong';

export interface CoarDividerProps {
  /** Alignment of the optional content text. */
  align?: DividerAlign;
  /** Visual variant controlling line opacity. */
  variant?: DividerVariant;
  /** Width of the divider as a percentage (0–100). */
  width?: number;
  /** Top spacing in pixels. */
  spacingTop?: number;
  /** Bottom spacing in pixels. */
  spacingBottom?: number;
}

const props = withDefaults(defineProps<CoarDividerProps>(), {
  align: 'center',
  variant: 'subtle',
  width: 90,
  spacingTop: 0,
  spacingBottom: 0,
});

const slots = useSlots();

const hostClasses = computed(() => [
  'coar-divider',
  `coar-divider--${props.align}`,
  `coar-divider--${props.variant}`,
]);

const hasContent = computed(() => !!slots.default);
</script>

<template>
  <div
    :class="hostClasses"
    role="separator"
    aria-orientation="horizontal"
  >
    <div
      class="coar-divider__container"
      :style="{
        width: `${props.width}%`,
        marginTop: `${props.spacingTop}px`,
        marginBottom: `${props.spacingBottom}px`,
      }"
    >
      <div class="coar-divider__line coar-divider__line--before"></div>
      <div v-if="hasContent" class="coar-divider__content">
        <slot />
      </div>
      <div class="coar-divider__line coar-divider__line--after"></div>
    </div>
  </div>
</template>

<style scoped>
.coar-divider {
  display: block;
  width: 100%;
}

.coar-divider__container {
  display: flex;
  align-items: center;
  margin-left: auto;
  margin-right: auto;
}

/* Lines */
.coar-divider__line {
  flex: 1;
  height: 1px;
  background-color: var(--coar-border-neutral-tertiary);
}

/* Content */
.coar-divider__content {
  padding: 0 var(--coar-spacing-m);
  color: var(--coar-text-neutral-secondary);
  font-size: var(--coar-body-small-base-size);
  white-space: nowrap;
}

/* Variant: subtle */
.coar-divider--subtle .coar-divider__line {
  opacity: 0.6;
}

/* Variant: strong */
.coar-divider--strong .coar-divider__line {
  opacity: 1;
}

/* Alignment: left — hide before line */
.coar-divider--left .coar-divider__line--before {
  display: none;
}

.coar-divider--left .coar-divider__content {
  padding-left: 0;
}

/* Alignment: right — hide after line */
.coar-divider--right .coar-divider__line--after {
  display: none;
}

.coar-divider--right .coar-divider__content {
  padding-right: 0;
}
</style>
