<script setup lang="ts">
import { ref } from 'vue';
import { CoarMultiSelect } from '@cocoar/vue-ui';

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
    <h2 class="vs-title">Open: select all, groups, two selected, disabled option</h2>
    <div style="width: 280px" data-visual-open>
      <CoarMultiSelect v-model="value" :options="options" show-select-all />
    </div>
  </section>
</template>
