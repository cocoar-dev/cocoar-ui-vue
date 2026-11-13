<script setup lang="ts">
// The device statements of all component pages, grouped like the sidebar. Used once, in
// guide/mobile.md; sync-skill.mjs turns the same tag into Markdown tables for the Agent Skill.
// A page's note is shown under its name.
import { withBase } from 'vitepress';
import { data as sections } from './devices.data';
import {
  DEVICE_BADGE_TYPES,
  DEVICE_CLASSES,
  DEVICE_CLASS_LABELS,
  DEVICE_STATE_LABELS,
} from '../../scripts/devices.mjs';

type DeviceClass = 'desktop' | 'tablet' | 'phone';

const classes = DEVICE_CLASSES as DeviceClass[];
const classLabels = DEVICE_CLASS_LABELS as Record<string, string>;
const stateLabels = DEVICE_STATE_LABELS as Record<string, string>;
const badgeTypes = DEVICE_BADGE_TYPES as Record<string, string>;
</script>

<template>
  <table class="coar-doc-device-matrix">
    <thead>
      <tr>
        <th>Page</th>
        <th v-for="c in classes" :key="c">{{ classLabels[c] }}</th>
      </tr>
    </thead>
    <tbody v-for="section in sections" :key="section.title">
      <tr class="coar-doc-device-matrix__section">
        <th :colspan="classes.length + 1" scope="rowgroup">{{ section.title }}</th>
      </tr>
      <tr v-for="page in section.pages" :key="page.url">
        <td>
          <a :href="withBase(page.url)">{{ page.title }}</a>
          <div v-if="page.note" class="coar-doc-device-matrix__note">{{ page.note }}</div>
        </td>
        <td v-for="c in classes" :key="c">
          <Badge
            :type="badgeTypes[page.devices[c]] ?? 'info'"
            :text="stateLabels[page.devices[c]] ?? page.devices[c]"
          />
        </td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
.coar-doc-device-matrix :deep(.VPBadge) {
  margin-left: 0;
  transform: none;
  white-space: nowrap;
}

.coar-doc-device-matrix td:first-child {
  width: 100%;
}

/* The note sits under the page name: a column of its own would be too narrow to read. */
.coar-doc-device-matrix__note {
  color: var(--vp-c-text-2);
  font-size: 13px;
  line-height: 1.45;
}

.coar-doc-device-matrix__section th {
  text-align: left;
  background: var(--vp-c-bg-soft);
}
</style>
