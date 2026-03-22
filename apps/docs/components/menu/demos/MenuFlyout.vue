<template>
  <CoarMenu>
    <CoarMenuItem icon="home" @click="handleClick('Home')">Home</CoarMenuItem>
    <CoarSubmenuItem label="Account" icon="user">
      <CoarMenu>
        <CoarMenuItem icon="user" @click="handleClick('Profile')">Profile</CoarMenuItem>
        <CoarMenuItem icon="shield" @click="handleClick('Security')">Security</CoarMenuItem>
        <CoarMenuItem icon="bell" @click="handleClick('Notifications')">Notifications</CoarMenuItem>
      </CoarMenu>
    </CoarSubmenuItem>
    <CoarSubmenuItem label="Reports" icon="chart-bar">
      <CoarMenu>
        <CoarMenuItem @click="handleClick('Sales')">Sales</CoarMenuItem>
        <CoarMenuItem @click="handleClick('Traffic')">Traffic</CoarMenuItem>
      </CoarMenu>
    </CoarSubmenuItem>
    <CoarMenuDivider />
    <CoarMenuItem icon="log-out" variant="danger" @click="handleClick('Logout')">Logout</CoarMenuItem>
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
