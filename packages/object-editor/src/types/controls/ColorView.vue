<script setup lang="ts">
import type { CoarValueViewProps } from '../types';

withDefaults(defineProps<CoarValueViewProps<string>>(), { locale: undefined });
</script>

<template>
  <span class="coar-object-editor-color">
    <span class="coar-object-editor-swatch" :style="{ background: value }" aria-hidden="true"></span>{{ value }}
  </span>
</template>
