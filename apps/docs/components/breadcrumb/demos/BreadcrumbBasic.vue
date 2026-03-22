<template>
  <CoarBreadcrumb>
    <CoarBreadcrumbItem><a href="javascript:void(0)">Home</a></CoarBreadcrumbItem>
    <CoarBreadcrumbItem><a href="javascript:void(0)">Users</a></CoarBreadcrumbItem>
    <CoarBreadcrumbItem :active="true">John Doe</CoarBreadcrumbItem>
  </CoarBreadcrumb>
</template>

<script setup lang="ts">
import { CoarBreadcrumb, CoarBreadcrumbItem } from '@cocoar/vue-ui';
</script>
