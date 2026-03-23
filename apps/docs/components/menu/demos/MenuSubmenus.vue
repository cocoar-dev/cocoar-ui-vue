<template>
  <CoarMenu>
    <CoarMenuItem @clicked="handleClick('Dashboard')">Dashboard</CoarMenuItem>
    <CoarSubExpand label="Settings">
      <CoarMenuItem @clicked="handleClick('Profile')">Profile</CoarMenuItem>
      <CoarMenuItem @clicked="handleClick('Security')">Security</CoarMenuItem>
      <CoarMenuItem @clicked="handleClick('Notifications')">Notifications</CoarMenuItem>
    </CoarSubExpand>
    <CoarSubExpand label="Reports">
      <CoarMenuItem @clicked="handleClick('Sales')">Sales</CoarMenuItem>
      <CoarMenuItem @clicked="handleClick('Traffic')">Traffic</CoarMenuItem>
    </CoarSubExpand>
    <CoarMenuDivider />
    <CoarMenuItem @clicked="handleClick('Logout')">Logout</CoarMenuItem>
  </CoarMenu>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarMenu, CoarMenuItem, CoarMenuDivider, CoarSubExpand } from '@cocoar/vue-ui';

const lastClicked = ref('');

function handleClick(item: string) {
  lastClicked.value = item;
}
</script>
