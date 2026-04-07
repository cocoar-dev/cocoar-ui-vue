<template>
  <CoarMenu>
    <CoarMenuItem icon="home" @clicked="handleClick('Home')">Home</CoarMenuItem>
    <CoarSubFlyout label="Account" icon="user">
      <CoarMenu>
        <CoarMenuItem icon="user" @clicked="handleClick('Profile')">Profile</CoarMenuItem>
        <CoarMenuItem icon="shield" @clicked="handleClick('Security')">Security</CoarMenuItem>
        <CoarMenuItem icon="bell" @clicked="handleClick('Notifications')">Notifications</CoarMenuItem>
      </CoarMenu>
    </CoarSubFlyout>
    <CoarSubFlyout label="Reports" icon="chart-bar">
      <CoarMenu>
        <CoarMenuItem @clicked="handleClick('Sales')">Sales</CoarMenuItem>
        <CoarMenuItem @clicked="handleClick('Traffic')">Traffic</CoarMenuItem>
      </CoarMenu>
    </CoarSubFlyout>
    <CoarMenuDivider />
    <CoarMenuItem icon="log-out" @clicked="handleClick('Logout')">Logout</CoarMenuItem>
  </CoarMenu>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarMenu, CoarMenuItem, CoarMenuDivider, CoarSubFlyout } from '@cocoar/vue-ui';

const lastClicked = ref('');

function handleClick(item: string) {
  lastClicked.value = item;
}
</script>
