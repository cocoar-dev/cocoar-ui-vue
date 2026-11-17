<script setup lang="ts">
import './compact-fonts';
/**
 * Compact profile (`.coar-compact`, Preview): small displays and inline feedback.
 * The same components as their default stories, inside the profile's container.
 */
import {
  CoarAvatar,
  CoarBadge,
  CoarDivider,
  CoarLink,
  CoarNote,
  CoarNotice,
  CoarProgressBar,
  CoarSpinner,
  CoarTag,
} from '@cocoar/vue-ui';

const badgeSizes = ['xs', 's', 'm', 'l', 'xl'] as const;
const badgeVariants = ['primary', 'secondary', 'success', 'warning', 'error', 'info'] as const;
const tagVariants = ['neutral', 'success', 'warning', 'error', 'info', 'accent'] as const;
const noteVariants = ['neutral', 'info', 'accent', 'success', 'warning', 'error'] as const;
const noticeVariants = ['info', 'success', 'warning', 'error', 'accent'] as const;
</script>

<template>
  <div class="coar-compact">
    <section class="vs-section">
      <h2 class="vs-title">Avatars (round, square), badges (sizes × variants, dots), tags</h2>
      <div class="vs-stack">
        <div class="vs-row">
          <CoarAvatar name="Ada Lovelace" size="xs" />
          <CoarAvatar name="Ada Lovelace" size="s" />
          <CoarAvatar name="Grace Hopper" size="m" />
          <CoarAvatar name="Grace Hopper" size="l" shape="square" />
          <CoarAvatar name="Linus Torvalds" size="xl" shape="square" />
        </div>
        <div v-for="size in badgeSizes" :key="size" class="vs-row">
          <CoarBadge
            v-for="variant in badgeVariants"
            :key="variant"
            :size="size"
            :variant="variant"
            :content="size === 'xs' ? 3 : 128"
            :max="99"
          />
          <CoarBadge :size="size" variant="error" dot />
        </div>
        <div class="vs-row">
          <CoarTag v-for="variant in tagVariants" :key="variant" :variant="variant" closable>
            {{ variant }}
          </CoarTag>
        </div>
        <div class="vs-row">
          <CoarTag size="s">small</CoarTag>
          <CoarTag size="m">medium</CoarTag>
          <CoarTag size="l">large</CoarTag>
        </div>
      </div>
    </section>

    <section class="vs-section">
      <h2 class="vs-title">Progress, spinner, divider with label, links</h2>
      <div class="vs-stack" style="align-items: stretch; width: 420px">
        <CoarProgressBar :value="64" show-value />
        <CoarProgressBar :value="30" variant="warning" size="s" show-value />
        <div class="vs-row">
          <CoarSpinner size="xs" />
          <CoarSpinner size="s" />
          <CoarSpinner size="m" />
          <CoarSpinner size="l" />
        </div>
        <CoarDivider>Weitere Einstellungen</CoarDivider>
        <CoarDivider align="left">Left aligned</CoarDivider>
        <div class="vs-row">
          <CoarLink href="#" size="s">Small link</CoarLink>
          <CoarLink href="#">Medium link</CoarLink>
          <CoarLink href="#" size="l">Large link</CoarLink>
          <CoarLink href="#" disabled>Disabled link</CoarLink>
        </div>
      </div>
    </section>

    <section class="vs-section">
      <h2 class="vs-title">Notices (label, details, call to action) and notes</h2>
      <div class="vs-stack" style="align-items: stretch; width: 560px">
        <CoarNotice v-for="variant in noticeVariants" :key="variant" :variant="variant" label="Indexing">
          Drei Dateien werden noch verarbeitet; Suchergebnisse können unvollständig sein.
          <template #cta>
            <CoarLink size="s">View files</CoarLink>
          </template>
        </CoarNotice>
        <CoarNotice variant="warning" label="Wartung">
          Am Sonntag ist der Export zwischen 02:00 und 04:00 nicht verfügbar.
          <template #details>Geplante Wartung der Datenbank.</template>
        </CoarNotice>
        <CoarNotice variant="info" placement="banner" label="Preview">
          Das kompakte Profil ist eine Vorschau.
        </CoarNotice>
        <CoarNote v-for="variant in noteVariants" :key="variant" :variant="variant" padding="s">
          {{ variant }}: Änderungen werden erst nach dem Veröffentlichen sichtbar.
        </CoarNote>
      </div>
    </section>
  </div>
</template>
