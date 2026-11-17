<script setup lang="ts">
import './compact-fonts';
/**
 * Compact profile (`.coar-compact`, Preview): sidebar expanded (heading, active item,
 * open group with nested items, divider, footer) beside its collapsed rail, and a
 * horizontal (top) sidebar.
 */
import {
  CoarSidebar,
  CoarSidebarDivider,
  CoarSidebarGroup,
  CoarSidebarHeading,
  CoarSidebarItem,
} from '@cocoar/vue-ui';
</script>

<template>
  <div class="coar-compact">
    <section class="vs-section">
      <h2 class="vs-title">Expanded and collapsed (size m), primary variant</h2>
      <div class="vs-row" style="align-items: stretch; gap: 24px">
        <div style="height: 440px; display: flex">
          <CoarSidebar variant="primary">
            <CoarSidebarItem icon="home" label="Dashboard" active />
            <CoarSidebarItem icon="list" label="Projekte" />
            <CoarSidebarHeading label="Verwaltung" />
            <CoarSidebarGroup icon="users" label="Benutzer" :open="true">
              <CoarSidebarItem icon="user-plus" label="Alle Benutzer" />
              <CoarSidebarItem icon="shield" label="Rollen" active />
            </CoarSidebarGroup>
            <CoarSidebarItem icon="lock" label="Archiv" disabled />
            <template #footer>
              <CoarSidebarDivider />
              <CoarSidebarItem icon="log-out" label="Abmelden" />
            </template>
          </CoarSidebar>
        </div>
        <div style="height: 440px; display: flex">
          <CoarSidebar variant="primary" :collapsed="true">
            <CoarSidebarItem icon="home" label="Dashboard" active />
            <CoarSidebarItem icon="list" label="Projekte" />
            <CoarSidebarHeading label="Verwaltung" />
            <CoarSidebarGroup icon="users" label="Benutzer" mode="flyout" />
            <template #footer>
              <CoarSidebarDivider />
              <CoarSidebarItem icon="log-out" label="Abmelden" />
            </template>
          </CoarSidebar>
        </div>
      </div>
    </section>

    <section class="vs-section">
      <h2 class="vs-title">Horizontal (side top)</h2>
      <CoarSidebar side="top">
        <CoarSidebarItem icon="home" label="Start" active />
        <CoarSidebarItem icon="list" label="Aufgaben" />
        <CoarSidebarDivider />
        <CoarSidebarItem icon="settings" label="Einstellungen" />
      </CoarSidebar>
    </section>
  </div>
</template>
