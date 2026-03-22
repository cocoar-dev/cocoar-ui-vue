<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px;">
    <CoarTextInput
      v-model="search"
      label="Search"
      placeholder="Type to search..."
      :clearable="true"
    />
    <span style="font-size: 13px; color: #64748b;">Value: {{ search || 'empty' }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarTextInput } from '@cocoar/vue-ui';

const search = ref('');
</script>
