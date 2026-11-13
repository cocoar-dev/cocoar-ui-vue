<script setup lang="ts">
import { CoarIcon, CoarTab, CoarTabGroup } from '@cocoar/vue-ui';
</script>

<template>
  <section class="vs-section">
    <h2 class="vs-title">Active tab, disabled tab, panel</h2>
    <CoarTabGroup model-value="files">
      <CoarTab id="overview">Overview</CoarTab>
      <CoarTab id="files">
        Files
        <template #content><p style="margin: 12px 0">The files of the project.</p></template>
      </CoarTab>
      <CoarTab id="members">Members</CoarTab>
      <CoarTab id="billing" disabled>Billing</CoarTab>
    </CoarTabGroup>
  </section>

  <section class="vs-section">
    <h2 class="vs-title">With actions</h2>
    <CoarTabGroup model-value="daily">
      <CoarTab id="daily">Daily</CoarTab>
      <CoarTab id="weekly">Weekly</CoarTab>
      <template #actions>
        <CoarIcon name="refresh-cw" size="s" />
        <CoarIcon name="download" size="s" />
      </template>
    </CoarTabGroup>
  </section>
</template>
