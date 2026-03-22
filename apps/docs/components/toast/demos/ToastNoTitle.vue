<template>
  <CoarButton @click="showNoTitle">Simple message</CoarButton>
</template>

<script setup lang="ts">
import { CoarButton, useToast } from '@cocoar/vue-ui';

const toast = useToast();

function showNoTitle() {
  toast.success('File uploaded successfully.');
}
</script>
