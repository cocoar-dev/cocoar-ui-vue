<script setup lang="ts">
import './compact-fonts';
/**
 * Compact profile (`.coar-compact`, Preview): a collapsed sidebar with its group's
 * flyout open (labels mode: header and items).
 */
import { CoarSidebar, CoarSidebarGroup, CoarSidebarItem } from '@cocoar/vue-ui';
</script>

<template>
  <div class="coar-compact" data-visual-open>
    <section class="vs-section">
      <h2 class="vs-title">Collapsed rail, group flyout open</h2>
      <div style="height: 260px; display: flex">
        <CoarSidebar :collapsed="true">
          <CoarSidebarItem icon="home" label="Dashboard" active />
          <CoarSidebarGroup icon="users" label="Benutzer" mode="flyout">
            <CoarSidebarItem icon="user-plus" label="Alle Benutzer" />
            <CoarSidebarItem icon="shield" label="Rollen" />
            <CoarSidebarItem icon="lock" label="Berechtigungen" />
          </CoarSidebarGroup>
        </CoarSidebar>
      </div>
    </section>
  </div>
</template>
