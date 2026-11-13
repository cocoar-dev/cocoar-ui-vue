<script setup lang="ts">
import { ref } from 'vue';
import { CoarTagSelect } from '@cocoar/vue-ui';

const options = [
  { value: 'vie', label: 'Vienna', group: 'Austria' },
  { value: 'grz', label: 'Graz', group: 'Austria' },
  { value: 'lnz', label: 'Linz (closed)', group: 'Austria', disabled: true },
  { value: 'ber', label: 'Berlin', group: 'Germany' },
  { value: 'muc', label: 'Munich', group: 'Germany' },
];
const value = ref(['vie', 'ber']);
</script>

<template>
  <section class="vs-section">
    <h2 class="vs-title">Open: two tags, the options not yet chosen</h2>
    <div style="width: 360px" data-visual-open>
      <CoarTagSelect v-model="value" :options="options" placeholder="Add cities" />
    </div>
  </section>
</template>
