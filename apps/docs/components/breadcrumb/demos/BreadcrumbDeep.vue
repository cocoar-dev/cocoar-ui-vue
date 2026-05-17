<template>
  <CoarBreadcrumb>
    <CoarBreadcrumbItem to="/shop" icon="home">Home</CoarBreadcrumbItem>
    <CoarBreadcrumbItem to="/shop/products" icon="folder">Products</CoarBreadcrumbItem>
    <CoarBreadcrumbItem to="/shop/products/electronics" icon="layout-grid">Electronics</CoarBreadcrumbItem>
    <CoarBreadcrumbItem to="/shop/products/electronics/laptops" icon="file-text">Laptops</CoarBreadcrumbItem>
    <CoarBreadcrumbItem active>MacBook Pro 16"</CoarBreadcrumbItem>
  </CoarBreadcrumb>
</template>

<script setup lang="ts">
import { CoarBreadcrumb, CoarBreadcrumbItem } from '@cocoar/vue-ui';
</script>
