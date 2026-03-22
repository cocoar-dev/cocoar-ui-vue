<template>
  <CoarBreadcrumb>
    <CoarBreadcrumbItem><a href="javascript:void(0)">Home</a></CoarBreadcrumbItem>
    <CoarBreadcrumbItem><a href="javascript:void(0)">Products</a></CoarBreadcrumbItem>
    <CoarBreadcrumbItem><a href="javascript:void(0)">Electronics</a></CoarBreadcrumbItem>
    <CoarBreadcrumbItem><a href="javascript:void(0)">Laptops</a></CoarBreadcrumbItem>
    <CoarBreadcrumbItem :active="true">MacBook Pro 16"</CoarBreadcrumbItem>
  </CoarBreadcrumb>
</template>

<script setup lang="ts">
import { CoarBreadcrumb, CoarBreadcrumbItem } from '@cocoar/vue-ui';
</script>
