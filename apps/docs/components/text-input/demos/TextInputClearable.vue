<template>
  <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px;">
    <CoarFormField label="Search">
      <CoarTextInput
        v-model="search"
        placeholder="Type to search..."
        :clearable="true"
      />
    </CoarFormField>
    <span style="font-size: 13px; color: #64748b;">Value: {{ search || 'empty' }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarTextInput, CoarFormField } from '@cocoar/vue-ui';

const search = ref('');
</script>
