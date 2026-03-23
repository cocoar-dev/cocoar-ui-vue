<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from '@cocoar/vue-localization';

export type AvatarSize = 'xs' | 's' | 'm' | 'l' | 'xl' | 'xxl';
export type AvatarShape = 'circle' | 'square';

export interface CoarAvatarProps {
  /** Image URL for the avatar. */
  src?: string;
  /** User's full name (used for initials fallback and alt text). */
  name?: string;
  /** Avatar size. */
  size?: AvatarSize;
  /** Avatar shape. */
  shape?: AvatarShape;
  /** Whether the avatar is interactive (clickable). */
  clickable?: boolean;
  /** Custom initials override (otherwise computed from name). */
  initials?: string;
  /** Maximum number of characters to compute from name (2 or 3). */
  maxLength?: 2 | 3;
  /** Background color for initials (auto-generated from name if not set). */
  bgColor?: string;
}

const props = withDefaults(defineProps<CoarAvatarProps>(), {
  src: '',
  name: '',
  size: 'm',
  shape: 'circle',
  clickable: false,
  initials: '',
  maxLength: 3,
  bgColor: '',
});

const { t } = useI18n();

const imageError = ref(false);

const showInitials = computed(() => !props.src || imageError.value);

const displayInitials = computed(() => {
  if (props.initials) return props.initials.slice(0, props.maxLength).toUpperCase();
  const name = props.name.trim();
  if (!name) return '?';
  const words = name.split(/\s+/).filter(Boolean);
  const letters = words.map((w) => w[0]);
  if (letters.length >= props.maxLength) {
    // Enough words — one letter per word up to maxLength
    return letters.slice(0, props.maxLength).join('').toUpperCase();
  }
  // Fewer words than maxLength — pad from the last word's remaining chars
  const prefix = letters.join('');
  const extra = words[words.length - 1].slice(1, 1 + (props.maxLength - prefix.length));
  return (prefix + extra).toUpperCase();
});

const computedBgColor = computed(() => {
  if (props.bgColor) return props.bgColor;
  if (!props.name) return 'var(--coar-background-neutral-tertiary)';
  let hash = 0;
  for (let i = 0; i < props.name.length; i++) {
    hash = props.name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 45%, 65%)`;
});

const hostClasses = computed(() => [
  'coar-avatar-host',
  `coar-avatar--${props.size}`,
  {
    'coar-avatar--square': props.shape === 'square',
    'coar-avatar--clickable': props.clickable,
  },
]);

function onImageError(): void {
  imageError.value = true;
}

function onImageLoad(): void {
  imageError.value = false;
}

defineExpose({ showInitials, displayInitials, computedBgColor });
</script>

<template>
  <span
    :class="hostClasses"
    :role="clickable ? 'button' : undefined"
    :tabindex="clickable ? 0 : undefined"
  >
    <span class="coar-avatar">
      <span
        v-if="showInitials"
        class="coar-avatar__initials"
        :style="{ backgroundColor: computedBgColor }"
        :aria-label="name || t('coar.ui.avatar.avatar', undefined, 'Avatar')"
      >
        {{ displayInitials }}
      </span>
      <img
        v-else
        class="coar-avatar__image"
        :src="src"
        :alt="name || t('coar.ui.avatar.avatar', undefined, 'Avatar')"
        @error="onImageError"
        @load="onImageLoad"
      />
      <span class="coar-avatar__status">
        <slot />
      </span>
    </span>
  </span>
</template>

<style scoped>
.coar-avatar-host {
  display: inline-flex;
  position: relative;
  vertical-align: middle;
  flex-shrink: 0;
}

.coar-avatar--clickable {
  cursor: pointer;
}

.coar-avatar--clickable:focus-visible {
  outline: var(--coar-focus-width) var(--coar-focus-style) var(--coar-focus-color);
  outline-offset: var(--coar-focus-offset);
  border-radius: 50%;
}

.coar-avatar--square.coar-avatar--clickable:focus-visible {
  border-radius: var(--coar-radius-xs);
}

.coar-avatar {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 50%;
  background: var(--coar-background-neutral-tertiary);
}

.coar-avatar--square .coar-avatar {
  border-radius: var(--coar-radius-xs);
}

/* Image */
.coar-avatar__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Initials */
.coar-avatar__initials {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-family: var(--coar-body-base-family);
  font-weight: var(--coar-font-weight-semi-bold);
  color: var(--coar-text-on-bold);
  text-transform: uppercase;
  user-select: none;
}

/* Status indicator */
.coar-avatar__status {
  position: absolute;
  bottom: 0;
  right: 0;
  transform: translate(25%, 25%);
}

.coar-avatar__status:empty {
  display: none;
}

/* Sizes: xs=24, s=32, m=40, l=48, xl=64, xxl=96 */
.coar-avatar--xs .coar-avatar {
  width: 24px;
  height: 24px;
}
.coar-avatar--xs .coar-avatar__initials {
  font-size: var(--coar-body-footnote-size);
}

.coar-avatar--s .coar-avatar {
  width: 32px;
  height: 32px;
}
.coar-avatar--s .coar-avatar__initials {
  font-size: var(--coar-body-caption-size);
}

.coar-avatar--m .coar-avatar {
  width: 40px;
  height: 40px;
}
.coar-avatar--m .coar-avatar__initials {
  font-size: var(--coar-body-small-base-size);
}

.coar-avatar--l .coar-avatar {
  width: 48px;
  height: 48px;
}
.coar-avatar--l .coar-avatar__initials {
  font-size: var(--coar-body-base-size);
}

.coar-avatar--xl .coar-avatar {
  width: 64px;
  height: 64px;
}
.coar-avatar--xl .coar-avatar__initials {
  font-size: var(--coar-font-size-m);
}

.coar-avatar--xxl .coar-avatar {
  width: 96px;
  height: 96px;
}
.coar-avatar--xxl .coar-avatar__initials {
  font-size: var(--coar-avatar-xl-font-size);
}

/* Status position by size */
.coar-avatar--xs .coar-avatar__status {
  transform: translate(15%, 15%);
}
.coar-avatar--s .coar-avatar__status {
  transform: translate(20%, 20%);
}
.coar-avatar--m .coar-avatar__status,
.coar-avatar--l .coar-avatar__status {
  transform: translate(25%, 25%);
}
.coar-avatar--xl .coar-avatar__status,
.coar-avatar--xxl .coar-avatar__status {
  transform: translate(30%, 30%);
}
</style>
