<script setup lang="ts">
// The device statement of a component page, under its title: three badges, the note, and a link
// to what the values mean. Placed automatically after the H1 by the markdown-it rule in
// ../config.ts; renders nothing on a page without a `devices` frontmatter line. The rules, the
// classes and the labels live in apps/docs/scripts/devices.mjs, which sync-skill.mjs uses too.
import { computed } from 'vue';
import { useData, withBase } from 'vitepress';
import {
  DEVICE_BADGE_TYPES,
  DEVICE_CLASSES,
  DEVICE_CLASS_LABELS,
  DEVICE_STATE_LABELS,
} from '../../scripts/devices.mjs';

type DeviceClass = 'desktop' | 'tablet' | 'phone';
type DeviceState = 'ready' | 'partial' | 'planned' | 'no';

const { frontmatter } = useData();

const badges = computed(() => {
  const devices = frontmatter.value.devices as Record<DeviceClass, DeviceState> | undefined;
  if (!devices || typeof devices !== 'object') return [];
  return (DEVICE_CLASSES as DeviceClass[]).map((c) => ({
    key: c,
    type: (DEVICE_BADGE_TYPES as Record<DeviceState, string>)[devices[c]] ?? 'info',
    text: `${(DEVICE_CLASS_LABELS as Record<DeviceClass, string>)[c]} · ${(DEVICE_STATE_LABELS as Record<DeviceState, string>)[devices[c]] ?? devices[c]}`,
  }));
});

const note = computed(() => (frontmatter.value.devicesNote as string | undefined) || '');
const href = withBase('/guide/mobile#device-support');
</script>

<template>
  <p v-if="badges.length" class="coar-doc-devices">
    <span class="coar-doc-devices__badges">
      <Badge v-for="b in badges" :key="b.key" :type="b.type" :text="b.text" />
    </span>
    <span v-if="note" class="coar-doc-devices__note">{{ note }}</span>
    <a class="coar-doc-devices__link" :href="href">What this means</a>
  </p>
</template>

<style scoped>
.coar-doc-devices {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 12px;
  margin: 8px 0 16px;
  font-size: 14px;
  line-height: 1.5;
}

.coar-doc-devices__badges {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px;
}

.coar-doc-devices__badges :deep(.VPBadge) {
  margin-left: 0;
  transform: none;
}

.coar-doc-devices__note {
  color: var(--vp-c-text-2);
}

.coar-doc-devices__link {
  font-size: 13px;
}
</style>
