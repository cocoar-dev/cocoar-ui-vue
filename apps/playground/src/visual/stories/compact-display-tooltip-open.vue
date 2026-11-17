<script setup lang="ts">
import './compact-fonts';
/**
 * Compact profile (`.coar-compact`, Preview): the tooltip of a focused trigger,
 * wrapping text.
 */
import { CoarButton, vTooltip } from '@cocoar/vue-ui';
</script>

<template>
  <div class="coar-compact">
    <section class="vs-section">
      <h2 class="vs-title">Tooltip of the focused trigger, wrapping text</h2>
      <div style="padding: 24px 0 0 200px">
        <CoarButton
          v-tooltip="{
            content: 'Speichert den Entwurf. Veröffentlichte Versionen bleiben, bis du erneut veröffentlichst.',
            placement: 'bottom',
          }"
          data-tooltip
          variant="secondary"
          icon-start="save"
        >
          Entwurf speichern
        </CoarButton>
      </div>
    </section>
  </div>
</template>
