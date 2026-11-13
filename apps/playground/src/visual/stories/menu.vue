<script setup lang="ts">
import {
  CoarMenu,
  CoarMenuDivider,
  CoarMenuHeading,
  CoarMenuItem,
  CoarSubExpand,
} from '@cocoar/vue-ui';
</script>

<template>
  <section class="vs-section">
    <h2 class="vs-title">
      Inline menus: heading, icons, active, disabled, divider, sub-expand closed and open; without
      icon column, borderless
    </h2>
    <div class="vs-row" style="align-items: flex-start; gap: 32px">
      <div style="width: 240px">
        <CoarMenu>
          <CoarMenuHeading label="Project" />
          <CoarMenuItem label="Overview" icon="home" active />
          <CoarMenuItem label="Files" icon="folder" />
          <CoarMenuItem label="Members" icon="users" />
          <CoarMenuItem label="Archive (no rights)" icon="lock" disabled />
          <CoarMenuDivider />
          <CoarSubExpand label="Settings" icon="settings">
            <CoarMenuItem label="General" />
            <CoarMenuItem label="Notifications" />
          </CoarSubExpand>
          <CoarSubExpand label="Security" icon="shield" :open="true">
            <CoarMenuItem label="Password" active />
            <CoarMenuItem label="Sessions" />
            <CoarMenuItem label="Keys (admins only)" disabled />
          </CoarSubExpand>
          <CoarMenuItem label="Sign out" icon="log-out" />
        </CoarMenu>
      </div>
      <div style="width: 200px">
        <CoarMenu :show-icon-column="false" borderless>
          <CoarMenuItem label="Rename" />
          <CoarMenuItem label="Duplicate" active />
          <CoarMenuItem label="Move" disabled />
          <CoarMenuDivider />
          <CoarMenuItem label="Delete" />
        </CoarMenu>
      </div>
    </div>
  </section>
</template>
