<script setup lang="ts">
import './compact-fonts';
/**
 * Compact profile (`.coar-compact`, Preview): an open popconfirm (title, message,
 * actions, arrow) from inside the profile's container.
 */
import { CoarButton, CoarPopconfirm } from '@cocoar/vue-ui';
</script>

<template>
  <div class="coar-compact" data-visual-open>
    <section class="vs-section">
      <h2 class="vs-title">Popconfirm opened below its trigger</h2>
      <div style="padding-left: 160px">
        <CoarPopconfirm
          title="Projekt löschen?"
          message="Alle Dateien und Kommentare werden endgültig entfernt."
          confirm-text="Löschen"
          cancel-text="Abbrechen"
          confirm-variant="danger"
          placement="bottom"
        >
          <CoarButton variant="secondary" icon-start="trash-2">Löschen</CoarButton>
        </CoarPopconfirm>
      </div>
    </section>
  </div>
</template>
