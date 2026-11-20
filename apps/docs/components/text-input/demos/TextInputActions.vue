<template>
  <CoarFormField label="Website" style="max-width: 360px;">
    <CoarTextInput v-model="host" placeholder="example.com">
      <template #prefixAction="{ disabled, readonly }">
        <CoarSelect
          v-model="scheme"
          :options="schemes"
          aria-label="Protocol"
          appearance="inline"
          width="content"
          :disabled="disabled"
          :readonly="readonly"
        />
      </template>
    </CoarTextInput>
  </CoarFormField>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarFormField, CoarSelect, CoarTextInput } from '@cocoar/vue-ui';

const host = ref('cocoar.dev');
const scheme = ref<string | null>('https://');
const schemes = [
  { value: 'https://', label: 'https://' },
  { value: 'http://', label: 'http://' },
];
</script>
