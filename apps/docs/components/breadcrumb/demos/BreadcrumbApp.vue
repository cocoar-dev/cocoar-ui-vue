<template>
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <CoarBreadcrumb>
      <CoarBreadcrumbItem><a href="javascript:void(0)">Dashboard</a></CoarBreadcrumbItem>
      <CoarBreadcrumbItem :active="true">Overview</CoarBreadcrumbItem>
    </CoarBreadcrumb>
    <CoarBreadcrumb>
      <CoarBreadcrumbItem><a href="javascript:void(0)">Settings</a></CoarBreadcrumbItem>
      <CoarBreadcrumbItem><a href="javascript:void(0)">Account</a></CoarBreadcrumbItem>
      <CoarBreadcrumbItem :active="true">Security</CoarBreadcrumbItem>
    </CoarBreadcrumb>
    <CoarBreadcrumb>
      <CoarBreadcrumbItem><a href="javascript:void(0)">Projects</a></CoarBreadcrumbItem>
      <CoarBreadcrumbItem><a href="javascript:void(0)">Alpha</a></CoarBreadcrumbItem>
      <CoarBreadcrumbItem><a href="javascript:void(0)">Issues</a></CoarBreadcrumbItem>
      <CoarBreadcrumbItem :active="true">#142 Fix date picker</CoarBreadcrumbItem>
    </CoarBreadcrumb>
  </div>
</template>

<script setup lang="ts">
import { CoarBreadcrumb, CoarBreadcrumbItem } from '@cocoar/vue-ui';
</script>
