<script setup lang="ts">
import './compact-fonts';
/**
 * Compact profile (`.coar-compact`, Preview): a workbench (`CoarPanelLayout`) with all
 * regions and a nested `CoarSplitPane` in the left region. Every divider
 * (`CoarPaneDivider`) is real: drag or arrow keys resize, the focus image shows its ring.
 */
import { ref } from 'vue';
import { CoarButton, CoarPanelLayout, CoarSplitPane } from '@cocoar/vue-ui';

const leftWidth = ref(200);
const rightWidth = ref(180);
const bottomHeight = ref(96);
const treeHeight = ref(150);
const leftOpen = ref(true);
</script>

<template>
  <div class="coar-compact" data-interaction="panel-layout">
    <section class="vs-section">
      <h2 class="vs-title">Panel layout: top, left with a nested split, content, right, bottom, status</h2>
      <div style="height: 440px; border: 1px solid var(--coar-border-neutral-tertiary)">
        <CoarPanelLayout
          v-model:left-width="leftWidth"
          v-model:right-width="rightWidth"
          v-model:bottom-height="bottomHeight"
          :left-open="leftOpen"
          :left-min="140"
          :left-max="320"
          :right-min="140"
          :bottom-min="64"
        >
          <template #top>
            <div style="display: flex; gap: 8px; align-items: center; padding: 6px 8px">
              <CoarButton size="s" variant="ghost" icon-start="panel-left" data-toggle-left @click="leftOpen = !leftOpen">
                Seitenleiste
              </CoarButton>
              <strong>Arbeitsbereich</strong>
            </div>
          </template>
          <template #left>
            <CoarSplitPane v-model:size="treeHeight" direction="column" :min="60" style="height: 100%">
              <template #first>
                <div style="padding: 8px">Dateien <span data-size="left">{{ leftWidth }}</span></div>
              </template>
              <template #second>
                <div style="padding: 8px">Details</div>
              </template>
            </CoarSplitPane>
          </template>
          <div style="padding: 12px">Inhalt — Überprüfung 0123456789</div>
          <template #bottom>
            <div style="padding: 8px">Ausgabe <span data-size="bottom">{{ bottomHeight }}</span></div>
          </template>
          <template #right>
            <div style="padding: 8px">Eigenschaften <span data-size="right">{{ rightWidth }}</span></div>
          </template>
          <template #status>
            <div style="padding: 2px 8px">Bereit</div>
          </template>
        </CoarPanelLayout>
      </div>
    </section>
  </div>
</template>
