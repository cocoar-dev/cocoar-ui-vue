<script setup lang="ts">
import { ref } from 'vue';
import { CoarSelect } from '@cocoar/vue-ui';

const options = [
  { value: 'none', label: 'No location' },
  { value: 'vie', label: 'Vienna', group: 'Austria', icon: 'map-pin' },
  { value: 'grz', label: 'Graz', group: 'Austria', icon: 'map-pin' },
  { value: 'lnz', label: 'Linz (closed)', group: 'Austria', icon: 'map-pin', disabled: true },
  { value: 'ber', label: 'Berlin', group: 'Germany', icon: 'globe' },
  { value: 'muc', label: 'Munich', group: 'Germany', icon: 'globe' },
];
const value = ref('grz');
</script>

<template>
  <section class="vs-section">
    <h2 class="vs-title">Open: groups, icons, selected, disabled option</h2>
    <div style="width: 280px" data-visual-open>
      <CoarSelect v-model="value" :options="options" />
    </div>
  </section>
</template>
