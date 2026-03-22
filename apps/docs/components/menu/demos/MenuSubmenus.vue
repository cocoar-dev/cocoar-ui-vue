<template>
  <CoarMenu>
    <CoarMenuItem @click="handleClick('Dashboard')">Dashboard</CoarMenuItem>
    <CoarSubExpand label="Settings">
      <CoarSubmenuItem @click="handleClick('Profile')">Profile</CoarSubmenuItem>
      <CoarSubmenuItem @click="handleClick('Security')">Security</CoarSubmenuItem>
      <CoarSubmenuItem @click="handleClick('Notifications')">Notifications</CoarSubmenuItem>
    </CoarSubExpand>
    <CoarSubExpand label="Reports">
      <CoarSubmenuItem @click="handleClick('Sales')">Sales</CoarSubmenuItem>
      <CoarSubmenuItem @click="handleClick('Traffic')">Traffic</CoarSubmenuItem>
    </CoarSubExpand>
    <CoarMenuDivider />
    <CoarMenuItem @click="handleClick('Logout')">Logout</CoarMenuItem>
  </CoarMenu>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarMenu, CoarMenuItem, CoarMenuDivider, CoarSubExpand, CoarSubmenuItem } from '@cocoar/vue-ui';

const lastClicked = ref('');

function handleClick(item: string) {
  lastClicked.value = item;
}
</script>
