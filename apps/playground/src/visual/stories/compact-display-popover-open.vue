<script setup lang="ts">
import './compact-fonts';
/**
 * Compact profile (`.coar-compact`, Preview): a popover opened from inside the
 * profile's container. The panel is teleported; it shows the profile once the overlay
 * context carries it.
 */
import { CoarButton, CoarPopover } from '@cocoar/vue-ui';
</script>

<template>
  <div class="coar-compact" data-visual-open>
    <section class="vs-section">
      <h2 class="vs-title">Popover opened by its trigger (click mode, interactive)</h2>
      <div style="padding-left: 160px">
        <CoarPopover mode="click" interactive>
          <CoarButton variant="secondary" icon-start="info">Details</CoarButton>
          <template #content>
            <div style="width: 260px; padding: 12px">
              <strong>Mit 3 Personen geteilt</strong>
              <p style="margin: 8px 0 12px">Alle mit dem Link können ansehen. Nur Besitzer können bearbeiten.</p>
              <CoarButton size="s" variant="tertiary">Zugriff verwalten</CoarButton>
            </div>
          </template>
        </CoarPopover>
      </div>
    </section>
  </div>
</template>
