<template>
  <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
    <CoarPopover mode="click">
      <CoarButton>Open Popover</CoarButton>
      <template #content>
        <div style="padding: 16px; max-width: 240px;">
          <h4 style="margin: 0 0 4px;">Popover Title</h4>
          <p style="margin: 0; font-size: 13px;">This is rich content inside a popover. It can contain forms, lists, and other interactive components.</p>
          <CoarButton variant="primary" size="s" style="margin-top: 8px;">Action</CoarButton>
        </div>
      </template>
    </CoarPopover>

    <CoarPopover mode="click">
      <CoarButton variant="secondary">More options</CoarButton>
      <template #content>
        <div style="display: flex; flex-direction: column; padding: 4px; gap: 2px; min-width: 140px;">
          <CoarButton variant="ghost" size="s">Edit</CoarButton>
          <CoarButton variant="ghost" size="s">Duplicate</CoarButton>
          <CoarButton variant="ghost" size="s">Archive</CoarButton>
          <CoarButton variant="danger" size="s">Delete</CoarButton>
        </div>
      </template>
    </CoarPopover>
  </div>
</template>

<script setup lang="ts">
import { CoarButton, CoarPopover } from '@cocoar/vue-ui';
</script>
