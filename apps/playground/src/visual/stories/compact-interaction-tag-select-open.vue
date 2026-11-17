<script setup lang="ts">
import './compact-fonts';
/**
 * Compact profile (`.coar-compact`, Preview): Tag select open by keyboard focus: two tags, the options not yet chosen. The panel is teleported and
 * takes the profile from the overlay context of its trigger.
 */
import { ref } from 'vue';
import { CoarTagSelect } from '@cocoar/vue-ui';
import { tagOptions } from './compact-interaction-data';

const value = ref(['vie', 'ber']);
</script>

<template>
  <div class="coar-compact" data-interaction="CoarTagSelect">
    <section class="vs-section">
      <h2 class="vs-title">Tag select open by keyboard focus: two tags, the options not yet chosen</h2>
      <div style="width: 360px" data-visual-open>
        <CoarTagSelect v-model="value" :options="tagOptions" placeholder="Städte hinzufügen" />
      </div>
    </section>
  </div>
</template>
