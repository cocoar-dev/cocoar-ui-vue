<template>
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <!-- Simple 2-level dashboard path -->
    <CoarBreadcrumb>
      <CoarBreadcrumbItem to="/dashboard" icon="layout-grid">Dashboard</CoarBreadcrumbItem>
      <CoarBreadcrumbItem active>Overview</CoarBreadcrumbItem>
    </CoarBreadcrumb>

    <!-- Settings drilldown -->
    <CoarBreadcrumb>
      <CoarBreadcrumbItem to="/settings" icon="settings">Settings</CoarBreadcrumbItem>
      <CoarBreadcrumbItem to="/settings/account" icon="user">Account</CoarBreadcrumbItem>
      <CoarBreadcrumbItem active>Security</CoarBreadcrumbItem>
    </CoarBreadcrumb>

    <!-- Project / issue drill-down -->
    <CoarBreadcrumb>
      <CoarBreadcrumbItem to="/projects" icon="folder">Projects</CoarBreadcrumbItem>
      <CoarBreadcrumbItem to="/projects/alpha">Alpha</CoarBreadcrumbItem>
      <CoarBreadcrumbItem to="/projects/alpha/issues" icon="bookmark">Issues</CoarBreadcrumbItem>
      <CoarBreadcrumbItem active>#142 Fix date picker</CoarBreadcrumbItem>
    </CoarBreadcrumb>
  </div>
</template>

<script setup lang="ts">
import { CoarBreadcrumb, CoarBreadcrumbItem } from '@cocoar/vue-ui';
</script>
