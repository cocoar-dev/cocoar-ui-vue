<template>
  <div>
    <CoarPagination v-model="page" :total-items="100" :page-size="10" />
    <p style="margin-top: 8px; font-size: 13px; color: var(--coar-text-neutral-secondary);">Current page: {{ page }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarPagination } from '@cocoar/vue-ui';

const page = ref(1);
</script>
