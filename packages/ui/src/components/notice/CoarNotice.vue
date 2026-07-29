<script setup lang="ts">
import { computed, useSlots } from 'vue';
import { useI18n } from '@cocoar/vue-localization';
import CoarIcon from '../icon/CoarIcon.vue';
import CoarPopover from '../popover/CoarPopover.vue';

export type NoticeVariant = 'neutral' | 'info' | 'success' | 'warning' | 'error' | 'accent';
export type NoticePlacement = 'inline' | 'banner';

export interface CoarNoticeProps {
  /** Semantic color and default icon. */
  variant?: NoticeVariant;
  /** Inline callout or edge-to-edge application banner. */
  placement?: NoticePlacement;
  /** Optional bold lead-in. A colon is added visually. */
  label?: string;
  /** Overrides the icon associated with the variant. */
  icon?: string;
  /** Keeps a single-line inline notice compact. Ignored for banners. */
  truncate?: boolean;
}

const props = withDefaults(defineProps<CoarNoticeProps>(), {
  variant: 'info',
  placement: 'inline',
  label: undefined,
  icon: undefined,
  truncate: false,
});

const slots = useSlots();
const { t } = useI18n();

const defaultIcons: Record<NoticeVariant, string> = {
  neutral: 'bell',
  info: 'info',
  success: 'check-circle-2',
  warning: 'triangle-alert',
  error: 'circle-alert',
  accent: 'star',
};

const resolvedIcon = computed(() => props.icon ?? defaultIcons[props.variant]);
const isTruncated = computed(() => props.truncate && props.placement === 'inline');
const hostClasses = computed(() => [
  'coar-notice',
  `coar-notice--${props.variant}`,
  `coar-notice--${props.placement}`,
  { 'coar-notice--truncate': isTruncated.value },
]);
</script>

<template>
  <div :class="hostClasses" role="note">
    <CoarIcon
      class="coar-notice__icon"
      :name="resolvedIcon"
      size="s"
      aria-hidden="true"
    />

    <div class="coar-notice__message">
      <strong v-if="label" class="coar-notice__label">{{ label }}:</strong>
      <span class="coar-notice__text"><slot /></span>
    </div>

    <CoarPopover v-if="slots.details" mode="both">
      <button type="button" class="coar-notice__details">
        {{ t('coar.ui.notice.details', undefined, 'Details') }}
      </button>
      <template #content>
        <slot name="details" />
      </template>
    </CoarPopover>

    <div v-if="slots.cta" class="coar-notice__cta">
      <slot name="cta" />
    </div>
  </div>
</template>

<style scoped>
.coar-notice {
  --coar-notice-background: var(--coar-background-neutral-secondary);
  --coar-notice-border: var(--coar-border-neutral-tertiary);
  --coar-notice-foreground: var(--coar-text-neutral-primary);

  display: flex;
  align-items: flex-start;
  gap: var(--coar-spacing-s);
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  border: 1px solid var(--coar-notice-border);
  background: var(--coar-notice-background);
  color: var(--coar-notice-foreground);
  font-size: 0.85rem;
  line-height: 1.4;
}

.coar-notice--inline {
  padding: var(--coar-spacing-s) var(--coar-spacing-m);
  border-radius: var(--coar-radius-xs);
}

.coar-notice--banner {
  padding: var(--coar-spacing-s) var(--coar-spacing-xl);
  border-width: 0 0 1px;
  border-radius: 0;
}

.coar-notice--info {
  --coar-notice-background: var(--coar-background-semantic-info-subtlest);
  --coar-notice-border: var(--coar-border-semantic-info-subtle);
  --coar-notice-foreground: var(--coar-text-semantic-info-bold);
}

.coar-notice--success {
  --coar-notice-background: var(--coar-background-semantic-success-subtlest);
  --coar-notice-border: var(--coar-border-semantic-success-subtle);
  --coar-notice-foreground: var(--coar-text-semantic-success-bold);
}

.coar-notice--warning {
  --coar-notice-background: var(--coar-background-semantic-warning-subtlest);
  --coar-notice-border: var(--coar-border-semantic-warning-subtle);
  --coar-notice-foreground: var(--coar-text-semantic-warning-bold);
}

.coar-notice--error {
  --coar-notice-background: var(--coar-background-semantic-error-subtlest);
  --coar-notice-border: var(--coar-border-semantic-error-subtle);
  --coar-notice-foreground: var(--coar-text-semantic-error-bold);
}

.coar-notice--accent {
  --coar-notice-background: var(--coar-background-accent-tertiary);
  --coar-notice-border: var(--coar-border-accent-secondary);
  --coar-notice-foreground: var(--coar-text-accent-primary);
}

.coar-notice__icon {
  flex: 0 0 auto;
  margin-top: 0.08em;
}

.coar-notice__message {
  flex: 1 1 auto;
  min-width: 0;
}

.coar-notice__label {
  margin-right: 0.35em;
  font-weight: 600;
}

.coar-notice--truncate .coar-notice__message {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.coar-notice__details {
  appearance: none;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 0.15em;
  white-space: nowrap;
  cursor: pointer;
}

.coar-notice__details:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
  border-radius: var(--coar-radius-xs);
}

.coar-notice__cta {
  flex: 0 0 auto;
  font-weight: 600;
  white-space: nowrap;
}

.coar-notice__cta :deep(.coar-link) {
  color: inherit;
  font-size: inherit;
  font-weight: inherit;
}

.coar-notice__message + :deep(.coar-popover),
.coar-notice__message + .coar-notice__cta {
  margin-left: auto;
}

@media (max-width: 640px) {
  .coar-notice--banner {
    flex-wrap: wrap;
    padding-inline: var(--coar-spacing-m);
  }

  .coar-notice--banner .coar-notice__message {
    flex-basis: calc(100% - 24px);
  }

  .coar-notice--banner :deep(.coar-popover),
  .coar-notice--banner .coar-notice__cta {
    margin-left: calc(16px + var(--coar-spacing-s));
  }
}
</style>
