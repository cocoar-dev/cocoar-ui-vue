<template>
  <CoarBreadcrumb>
    <CoarBreadcrumbItem to="/admin" icon="home">Home</CoarBreadcrumbItem>
    <CoarBreadcrumbItem to="/admin/users" icon="users">Users</CoarBreadcrumbItem>
    <CoarBreadcrumbItem active>John Doe</CoarBreadcrumbItem>
  </CoarBreadcrumb>
</template>

<script setup lang="ts">
import { CoarBreadcrumb, CoarBreadcrumbItem } from '@cocoar/vue-ui';
</script>
