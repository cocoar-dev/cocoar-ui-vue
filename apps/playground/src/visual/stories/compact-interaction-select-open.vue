<script setup lang="ts">
import './compact-fonts';
/**
 * Compact profile (`.coar-compact`, Preview): Select open: groups, icons, selected, disabled and a long option. The panel is teleported and
 * takes the profile from the overlay context of its trigger.
 */
import { ref } from 'vue';
import { CoarSelect } from '@cocoar/vue-ui';
import { cityOptions } from './compact-interaction-data';

const value = ref('grz');
</script>

<template>
  <div class="coar-compact" data-interaction="CoarSelect">
    <section class="vs-section">
      <h2 class="vs-title">Select open: groups, icons, selected, disabled and a long option</h2>
      <div style="width: 280px" data-visual-open>
        <CoarSelect v-model="value" :options="cityOptions" />
      </div>
    </section>
  </div>
</template>
