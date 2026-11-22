<template>
  <CoarMiniMonth v-model="day" locale="en-GB" :first-day-of-week="1" />
  <p>Selected: {{ day }}</p>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarMiniMonth, Temporal } from '@cocoar/vue-calendar';

const day = ref(Temporal.PlainDate.from('2026-11-19'));
</script>
