<template>
  <CoarMenu>
    <CoarMenuItem @click="handleClick('Dashboard')">Dashboard</CoarMenuItem>
    <CoarSubExpand label="Settings">
      <CoarMenuItem @click="handleClick('Profile')">Profile</CoarMenuItem>
      <CoarMenuItem @click="handleClick('Security')">Security</CoarMenuItem>
      <CoarMenuItem @click="handleClick('Notifications')">Notifications</CoarMenuItem>
    </CoarSubExpand>
    <CoarSubExpand label="Reports">
      <CoarMenuItem @click="handleClick('Sales')">Sales</CoarMenuItem>
      <CoarMenuItem @click="handleClick('Traffic')">Traffic</CoarMenuItem>
    </CoarSubExpand>
    <CoarMenuDivider />
    <CoarMenuItem @click="handleClick('Logout')">Logout</CoarMenuItem>
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
