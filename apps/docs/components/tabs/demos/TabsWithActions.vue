<template>
  <div>
    <CoarTabGroup v-model="activeTab">
      <CoarTab id="daily">Daily</CoarTab>
      <CoarTab id="weekly">Weekly</CoarTab>
      <CoarTab id="monthly">Monthly</CoarTab>

      <template #actions>
        <button type="button" class="demo-action" title="Refresh" @click="refresh">
          <CoarIcon name="refresh-cw" size="s" />
        </button>
        <button type="button" class="demo-action" title="Export" @click="lastAction = 'Export clicked'">
          <CoarIcon name="download" size="s" />
        </button>
      </template>
    </CoarTabGroup>
    <div class="demo-panel">
      <p style="font-size: 13px; margin: 0 0 8px;">
        Viewing <strong>{{ activeTab }}</strong> report.
      </p>
      <p style="font-size: 12px; color: var(--coar-text-neutral-secondary); margin: 0;">
        Last action: {{ lastAction }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarTabGroup, CoarTab, CoarIcon } from '@cocoar/vue-ui';

const activeTab = ref('daily');
const lastAction = ref('(none)');

function refresh() {
  lastAction.value = `Refreshed ${activeTab.value} at ${new Date().toLocaleTimeString()}`;
}
</script>

<style scoped>
.demo-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 1px solid transparent;
  background: transparent;
  color: var(--coar-icon-neutral-secondary);
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.12s, border-color 0.12s, color 0.12s;
}
.demo-action:hover {
  background: var(--coar-surface-neutral-subtle);
  border-color: var(--coar-border-neutral);
  color: var(--coar-icon-neutral-primary);
}

.demo-panel {
  padding: 16px;
  border: 1px solid var(--coar-border-neutral-secondary);
  border-top: none;
  border-radius: 0 0 8px 8px;
  min-height: 60px;
}
</style>
