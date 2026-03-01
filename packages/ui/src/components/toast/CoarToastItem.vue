<script setup lang="ts">
import { ref, onBeforeUnmount, computed } from 'vue';
import type { ToastVariant } from './toast-types';
import CoarIcon from '../icon/CoarIcon.vue';

const ICON_MAP: Record<ToastVariant, string> = {
  success: 'check',
  error: 'close',
  warning: 'important',
  info: 'question',
};

const props = defineProps<{
  variant: ToastVariant;
  title: string;
  message: string;
  duration: number;
  dismissible: boolean;
  showProgress: boolean;
  action: { label: string; callback: () => void } | null;
}>();

const emit = defineEmits<{
  dismissed: [];
  actionClicked: [];
}>();

const isPaused = ref(false);
const iconName = computed(() => ICON_MAP[props.variant]);

let timer: ReturnType<typeof setTimeout> | null = null;
let startTime = 0;
let remaining = 0;

function startAutoClose() {
  if (props.duration <= 0) return;
  remaining = props.duration;
  startTime = Date.now();
  timer = setTimeout(() => {
    emit('dismissed');
  }, remaining);
}

function onMouseEnter() {
  if (props.duration <= 0) return;
  isPaused.value = true;
  if (timer) {
    clearTimeout(timer);
    timer = null;
    remaining = Math.max(0, remaining - (Date.now() - startTime));
  }
}

function onMouseLeave() {
  if (props.duration <= 0) return;
  isPaused.value = false;
  if (remaining > 0) {
    startTime = Date.now();
    timer = setTimeout(() => {
      emit('dismissed');
    }, remaining);
  }
}

function onDismiss() {
  clearTimer();
  emit('dismissed');
}

function onAction() {
  if (props.action) {
    props.action.callback();
  }
  emit('actionClicked');
}

function clearTimer() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}

onBeforeUnmount(() => clearTimer());

defineExpose({ startAutoClose });
</script>

<template>
  <div
    :class="['coar-toast', `coar-toast--${variant}`, { 'coar-toast--no-title': !title }]"
    :role="variant === 'error' ? 'alert' : 'status'"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <div class="coar-toast-icon">
      <CoarIcon :name="iconName" size="s" />
    </div>
    <div class="coar-toast-content">
      <div v-if="title" class="coar-toast-title">{{ title }}</div>
      <div class="coar-toast-message">{{ message }}</div>
    </div>
    <div class="coar-toast-actions">
      <button
        v-if="action"
        class="coar-toast-action-btn"
        :aria-label="action.label"
        @click="onAction"
      >
        {{ action.label }}
      </button>
      <button
        v-if="dismissible"
        class="coar-toast-close"
        aria-label="Dismiss notification"
        @click="onDismiss"
      >
        <CoarIcon name="x" size="xs" />
      </button>
    </div>
    <div v-if="showProgress && duration > 0" class="coar-toast-progress">
      <div
        class="coar-toast-progress-bar"
        :class="{ 'coar-toast-progress-bar--paused': isPaused }"
        :style="{ animationDuration: `${duration}ms` }"
      />
    </div>
  </div>
</template>

<style scoped>
.coar-toast {
  display: flex;
  align-items: flex-start;
  gap: var(--coar-toast-gap);
  padding: var(--coar-toast-padding);
  background: var(--coar-toast-background);
  border-radius: var(--coar-toast-border-radius);
  box-shadow: var(--coar-shadow-l, 0 8px 24px rgba(0, 0, 0, 0.12));
  border: 1px solid var(--coar-border-neutral);
  border-left: var(--coar-toast-border-width) solid transparent;
  position: relative;
  overflow: hidden;
  min-width: var(--coar-toast-width);
  max-width: var(--coar-toast-width);
  pointer-events: auto;
  animation: coar-toast-slide-in var(--coar-duration-slow) var(--coar-ease-out);
}

/* Variant border colors */
.coar-toast--success { border-left-color: var(--coar-background-semantic-success-bold); }
.coar-toast--error { border-left-color: var(--coar-background-semantic-error-bold); }
.coar-toast--warning { border-left-color: var(--coar-background-semantic-warning-bold); }
.coar-toast--info { border-left-color: var(--coar-background-semantic-info-bold); }

/* Icon colors */
.coar-toast--success .coar-toast-icon { color: var(--coar-text-semantic-success-bold); }
.coar-toast--error .coar-toast-icon { color: var(--coar-text-semantic-error-bold); }
.coar-toast--warning .coar-toast-icon { color: var(--coar-text-semantic-warning-bold); }
.coar-toast--info .coar-toast-icon { color: var(--coar-text-semantic-info-bold); }

.coar-toast-icon {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  padding-top: 1px;
}

.coar-toast-content {
  flex: 1;
  min-width: 0;
}

.coar-toast-title {
  font-weight: 600;
  font-size: var(--coar-body-base-size);
  color: var(--coar-text-neutral-primary);
  margin-bottom: var(--coar-spacing-xxs);
}

.coar-toast-message {
  font-size: var(--coar-body-small-base-size);
  color: var(--coar-text-neutral-secondary);
}

/* No-title: single-line compact toast */
.coar-toast--no-title {
  align-items: center;
}

.coar-toast--no-title .coar-toast-message {
  font-weight: 600;
  font-size: var(--coar-body-base-size);
  color: var(--coar-text-neutral-primary);
}

.coar-toast-actions {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-xs);
  flex-shrink: 0;
}

.coar-toast-action-btn {
  background: none;
  border: none;
  padding: var(--coar-spacing-xxs) var(--coar-spacing-xs);
  font-size: var(--coar-body-small-base-size);
  font-weight: 600;
  color: var(--coar-text-accent-primary);
  cursor: pointer;
  border-radius: var(--coar-radius-s);
  transition: background-color var(--coar-duration-fast) var(--coar-ease-out);
}

.coar-toast-action-btn:hover {
  background-color: var(--coar-background-accent-secondary);
}

.coar-toast-action-btn:focus-visible {
  outline: var(--coar-focus-width) var(--coar-focus-style) var(--coar-focus-color);
  outline-offset: -2px;
}

.coar-toast-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  padding: var(--coar-spacing-xxs);
  border-radius: var(--coar-radius-s);
  color: var(--coar-text-neutral-secondary);
  cursor: pointer;
  transition: background-color var(--coar-duration-fast) var(--coar-ease-out), color var(--coar-duration-fast) var(--coar-ease-out);
}

.coar-toast-close:hover {
  background-color: var(--coar-background-neutral-secondary);
  color: var(--coar-text-neutral-primary);
}

.coar-toast-close:focus-visible {
  outline: var(--coar-focus-width) var(--coar-focus-style) var(--coar-focus-color);
  outline-offset: -2px;
}

/* Progress bar */
.coar-toast-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: var(--coar-toast-progress-height);
  background: var(--coar-background-neutral-tertiary);
}

.coar-toast-progress-bar {
  height: 100%;
  background: var(--coar-background-neutral-quaternary);
  transform-origin: left;
  animation: coar-toast-progress linear forwards;
}

.coar-toast--success .coar-toast-progress-bar { background: var(--coar-background-semantic-success-bold); }
.coar-toast--error .coar-toast-progress-bar { background: var(--coar-background-semantic-error-bold); }
.coar-toast--warning .coar-toast-progress-bar { background: var(--coar-background-semantic-warning-bold); }
.coar-toast--info .coar-toast-progress-bar { background: var(--coar-background-semantic-info-bold); }

.coar-toast-progress-bar--paused {
  animation-play-state: paused;
}

@keyframes coar-toast-progress {
  from { transform: scaleX(1); }
  to { transform: scaleX(0); }
}

@keyframes coar-toast-slide-in {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .coar-toast {
    animation: none;
  }
  .coar-toast-action-btn,
  .coar-toast-close {
    transition: none;
  }
  .coar-toast-progress-bar {
    animation: none;
    transform: scaleX(0);
  }
}
</style>
