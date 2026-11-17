<script setup lang="ts">
import './compact-fonts';
/**
 * Compact profile (`.coar-compact`, Preview): a context menu opened on mount at a point
 * (the overlay's point anchor, as a right click there), whose target is an element inside the
 * profile. The spec opens the first flyout and the nested one inside it.
 */
import { onMounted, useTemplateRef } from 'vue';
import {
  CoarContextMenu,
  CoarMenuDivider,
  CoarMenuHeading,
  CoarMenuItem,
  CoarSubFlyout,
  useContextMenu,
} from '@cocoar/vue-ui';

const menu = useContextMenu();
const target = useTemplateRef<HTMLElement>('target');
onMounted(() => {
  // What a right click on the row delivers: a point and the element it hit.
  const event = { clientX: 140, clientY: 110, target: target.value };
  menu.open(event);
});
</script>

<template>
  <div class="coar-compact" data-interaction="context-menu">
    <section class="vs-section">
      <h2 class="vs-title">Context menu at a point, with an open flyout and a nested flyout</h2>
      <div ref="target" data-context-target style="padding: 8px 12px; width: 220px" @contextmenu="menu.open">Bericht_2026.pdf</div>
      <CoarContextMenu :menu="menu">
        <CoarMenuHeading>Datei</CoarMenuHeading>
        <CoarMenuItem label="Öffnen" icon="external-link" />
        <CoarMenuItem label="Link kopieren" icon="link" />
        <CoarSubFlyout label="Verschieben nach" icon="folder" data-level="1">
          <CoarMenuItem label="Projekte" icon="folder" />
          <CoarSubFlyout label="Archiv" icon="folder" data-level="2">
            <CoarMenuItem label="2025" icon="folder" />
            <CoarMenuItem label="2026" icon="folder" />
            <CoarMenuItem label="Gesperrt" icon="lock" disabled />
          </CoarSubFlyout>
          <CoarMenuItem label="Geteilt (nur lesen)" icon="folder" disabled />
        </CoarSubFlyout>
        <CoarMenuItem label="Umbenennen (gesperrt)" icon="pencil" disabled />
        <CoarMenuDivider />
        <CoarMenuItem label="Löschen" icon="trash-2" />
      </CoarContextMenu>
    </section>
  </div>
</template>
