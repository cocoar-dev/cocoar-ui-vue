<template>
  <div>
    <CoarTabGroup v-model="activeTab">
      <CoarTab id="overview">Overview</CoarTab>
      <CoarTab id="features">Features</CoarTab>
      <CoarTab id="api">API</CoarTab>
      <CoarTab id="examples">Examples</CoarTab>
    </CoarTabGroup>
    <div style="padding: 16px; border: 1px solid var(--coar-border-neutral-secondary); border-top: none; border-radius: 0 0 8px 8px; min-height: 100px;">
      <div v-if="activeTab === 'overview'">
        <h4 style="margin: 0 0 8px;">Overview</h4>
        <p style="font-size: 13px;">This is the overview content. It provides a high-level introduction to the component.</p>
      </div>
      <div v-else-if="activeTab === 'features'">
        <h4 style="margin: 0 0 8px;">Features</h4>
        <ul style="padding-left: 16px; display: flex; flex-direction: column; gap: 4px; font-size: 13px;">
          <li>Keyboard navigation (Arrow keys, Home, End)</li>
          <li>ARIA tab panel pattern</li>
          <li>Controlled and uncontrolled modes</li>
          <li>Custom content in each panel</li>
        </ul>
      </div>
      <div v-else-if="activeTab === 'api'">
        <h4 style="margin: 0 0 8px;">API</h4>
        <p style="font-size: 13px;">Use <code>v-model</code> on <code>CoarTabGroup</code> to control the active tab programmatically.</p>
      </div>
      <div v-else-if="activeTab === 'examples'">
        <h4 style="margin: 0 0 8px;">Examples</h4>
        <p style="font-size: 13px;">See the demos below for more usage patterns.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarTabGroup, CoarTab } from '@cocoar/vue-ui';

const activeTab = ref('overview');
</script>
