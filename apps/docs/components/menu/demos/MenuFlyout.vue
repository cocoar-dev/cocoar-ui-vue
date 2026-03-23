<template>
  <CoarMenu>
    <CoarMenuItem icon="home" @clicked="handleClick('Home')">Home</CoarMenuItem>
    <CoarSubmenuItem label="Account" icon="user">
      <CoarMenu>
        <CoarMenuItem icon="user" @clicked="handleClick('Profile')">Profile</CoarMenuItem>
        <CoarMenuItem icon="shield" @clicked="handleClick('Security')">Security</CoarMenuItem>
        <CoarMenuItem icon="bell" @clicked="handleClick('Notifications')">Notifications</CoarMenuItem>
      </CoarMenu>
    </CoarSubmenuItem>
    <CoarSubmenuItem label="Reports" icon="chart-bar">
      <CoarMenu>
        <CoarMenuItem @clicked="handleClick('Sales')">Sales</CoarMenuItem>
        <CoarMenuItem @clicked="handleClick('Traffic')">Traffic</CoarMenuItem>
      </CoarMenu>
    </CoarSubmenuItem>
    <CoarMenuDivider />
    <CoarMenuItem icon="log-out" @clicked="handleClick('Logout')">Logout</CoarMenuItem>
  </CoarMenu>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarMenu, CoarMenuItem, CoarMenuDivider, CoarSubmenuItem } from '@cocoar/vue-ui';

const lastClicked = ref('');

function handleClick(item: string) {
  lastClicked.value = item;
}
</script>
