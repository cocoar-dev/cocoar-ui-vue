<script setup lang="ts">
import './compact-fonts';
/**
 * Compact profile (`.coar-compact`, Preview): an inline menu with an open sub-flyout;
 * the flyout panel is teleported.
 */
import { CoarMenu, CoarMenuDivider, CoarMenuItem, CoarSubFlyout } from '@cocoar/vue-ui';
</script>

<template>
  <div class="coar-compact" data-visual-open>
    <section class="vs-section">
      <h2 class="vs-title">Menu with an open sub-flyout</h2>
      <div style="width: 220px">
        <CoarMenu>
          <CoarMenuItem label="Öffnen" icon="external-link" />
          <CoarSubFlyout label="Verschieben nach" icon="folder">
            <CoarMenuItem label="Projekte" icon="folder" />
            <CoarMenuItem label="Archiv" icon="folder" />
            <CoarMenuItem label="Geteilt (nur lesen)" icon="folder" disabled />
          </CoarSubFlyout>
          <CoarMenuDivider />
          <CoarMenuItem label="Löschen" icon="trash-2" />
        </CoarMenu>
      </div>
    </section>
  </div>
</template>
