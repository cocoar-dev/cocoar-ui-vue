<template>
  <div style="max-width: 320px; height: 240px;">
    <CoarListbox
      :options="members"
      display-only
      label="Team members"
      show-count
      :searchable="members.length > 5"
    />
  </div>
</template>

<script setup lang="ts">
import { CoarListbox } from '@cocoar/vue-ui';
import type { CoarListboxOption } from '@cocoar/vue-ui';

const members: CoarListboxOption<string>[] = [
  { value: 'alice', label: 'Alice Müller', subtitle: 'Engineer · Zürich', icon: 'user' },
  { value: 'bob', label: 'Bob Meier', subtitle: 'Designer · Basel', icon: 'user' },
  { value: 'clara', label: 'Clara Schmid', subtitle: 'PM · Bern', icon: 'user' },
  { value: 'dan', label: 'Dan Roth', subtitle: 'Engineer · Remote', icon: 'user' },
];
</script>
