<script setup lang="ts">
import './compact-fonts';
/**
 * Compact profile (`.coar-compact`, Preview): Multi select open: select all, groups, two selected, disabled option. The panel is teleported and
 * takes the profile from the overlay context of its trigger.
 */
import { ref } from 'vue';
import { CoarMultiSelect } from '@cocoar/vue-ui';
import { cityOptions } from './compact-interaction-data';

const value = ref(['vie', 'ber']);
</script>

<template>
  <div class="coar-compact" data-interaction="CoarMultiSelect">
    <section class="vs-section">
      <h2 class="vs-title">Multi select open: select all, groups, two selected, disabled option</h2>
      <div style="width: 300px" data-visual-open>
        <CoarMultiSelect v-model="value" :options="cityOptions" show-select-all />
      </div>
    </section>
  </div>
</template>
