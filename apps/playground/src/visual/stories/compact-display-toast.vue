<script setup lang="ts">
import './compact-fonts';
/**
 * Compact profile (`.coar-compact`, Preview): toast items of every variant, with
 * and without title, with an action and dismiss button. Rendered in place (no
 * service, no timer) so the picture is the item itself.
 */
import { CoarToastItem } from '@cocoar/vue-ui';

const variants = ['success', 'error', 'warning', 'info'] as const;
const action = { label: 'Rückgängig', callback: () => {} };
</script>

<template>
  <div class="coar-compact">
    <section class="vs-section">
      <h2 class="vs-title">Toast items: variants with title and action; without title</h2>
      <div class="vs-stack">
        <CoarToastItem
          v-for="variant in variants"
          :key="variant"
          :variant="variant"
          title="Änderungen gespeichert"
          message="Das Projekt wurde für alle Mitglieder aktualisiert."
          :duration="0"
          dismissible
          :show-progress="false"
          :action="variant === 'success' ? action : null"
        />
        <CoarToastItem
          variant="info"
          title=""
          message="Kopiert"
          :duration="0"
          dismissible
          :show-progress="false"
          :action="null"
        />
      </div>
    </section>
  </div>
</template>
