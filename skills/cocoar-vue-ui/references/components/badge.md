<!-- Generated from apps/docs/components/badge.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Badge

Badges draw attention to counts, statuses, or short labels. Attach them to icons, avatars, or buttons to surface information that needs a quick glance -- like unread messages, plan tiers, or live/offline indicators.

```ts
import { CoarBadge } from '@cocoar/vue-ui';
```

## Variants

Six semantic variants let you match the badge to its meaning -- use `success` for positive states, `error` for alerts, and so on.

**Demo — `badge/demos/BadgeVariants.vue`**

```vue
<template>
  <div style="display: flex; flex-wrap: wrap; gap: 16px; align-items: center;">
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <CoarBadge :content="42" variant="primary" />
      <span style="font-size: 10px; color: #64748b; font-family: monospace;">PRIMARY</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <CoarBadge :content="42" variant="secondary" />
      <span style="font-size: 10px; color: #64748b; font-family: monospace;">SECONDARY</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <CoarBadge :content="42" variant="success" />
      <span style="font-size: 10px; color: #64748b; font-family: monospace;">SUCCESS</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <CoarBadge :content="42" variant="warning" />
      <span style="font-size: 10px; color: #64748b; font-family: monospace;">WARNING</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <CoarBadge :content="42" variant="error" />
      <span style="font-size: 10px; color: #64748b; font-family: monospace;">ERROR</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <CoarBadge :content="42" variant="info" />
      <span style="font-size: 10px; color: #64748b; font-family: monospace;">INFO</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CoarBadge } from '@cocoar/vue-ui';
</script>
```

## Sizes

Five sizes from tiny `xs` (great for inline status) to bold `xl` (ideal for dashboard counters).

**Demo — `badge/demos/BadgeSizes.vue`**

```vue
<template>
  <div style="display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-end;">
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <CoarBadge :content="7" size="xs" />
      <span style="font-size: 10px; color: #64748b; font-family: monospace;">XS (12px)</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <CoarBadge :content="7" size="s" />
      <span style="font-size: 10px; color: #64748b; font-family: monospace;">S (16px)</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <CoarBadge :content="7" size="m" />
      <span style="font-size: 10px; color: #64748b; font-family: monospace;">M (20px)</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <CoarBadge :content="7" size="l" />
      <span style="font-size: 10px; color: #64748b; font-family: monospace;">L (24px)</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <CoarBadge :content="7" size="xl" />
      <span style="font-size: 10px; color: #64748b; font-family: monospace;">XL (32px)</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CoarBadge } from '@cocoar/vue-ui';
</script>
```

## Text Content

Badges aren't limited to numbers. Use short text labels like "New", "Beta", or "Pro" to tag features and content.

**Demo — `badge/demos/BadgeText.vue`**

```vue
<template>
  <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center;">
    <CoarBadge content="New" variant="info" size="l" />
    <CoarBadge content="Beta" variant="warning" size="l" />
    <CoarBadge content="Pro" variant="success" size="l" />
    <CoarBadge content="Hot" variant="error" size="l" />
    <CoarBadge content="v2" variant="secondary" size="l" />
  </div>
</template>

<script setup lang="ts">
import { CoarBadge } from '@cocoar/vue-ui';
</script>
```

## Max Value

Set a `max` to cap large numbers gracefully. Perfect for notification counts where "99+" is more useful than "1,247".

**Demo — `badge/demos/BadgeMax.vue`**

```vue
<template>
  <div style="display: flex; flex-wrap: wrap; gap: 16px; align-items: center;">
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <CoarBadge :content="5" :max="99" />
      <span style="font-size: 10px; color: #64748b; font-family: monospace;">5 (max 99)</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <CoarBadge :content="99" :max="99" />
      <span style="font-size: 10px; color: #64748b; font-family: monospace;">99 (max 99)</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <CoarBadge :content="100" :max="99" />
      <span style="font-size: 10px; color: #64748b; font-family: monospace;">100 → "99+"</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <CoarBadge :content="999" :max="99" />
      <span style="font-size: 10px; color: #64748b; font-family: monospace;">999 → "99+"</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CoarBadge } from '@cocoar/vue-ui';
</script>
```

## Dot Mode

When you only need to signal presence or status without a specific value, `dot` mode provides a minimal, color-coded indicator.

**Demo — `badge/demos/BadgeDot.vue`**

```vue
<template>
  <div style="display: flex; flex-wrap: wrap; gap: 16px; align-items: center;">
    <div style="display: flex; align-items: center; gap: 6px;">
      <CoarBadge variant="success" dot />
      <span style="font-size: 13px; color: #64748b;">Online</span>
    </div>
    <div style="display: flex; align-items: center; gap: 6px;">
      <CoarBadge variant="error" dot />
      <span style="font-size: 13px; color: #64748b;">Offline</span>
    </div>
    <div style="display: flex; align-items: center; gap: 6px;">
      <CoarBadge variant="warning" dot />
      <span style="font-size: 13px; color: #64748b;">Away</span>
    </div>
    <div style="display: flex; align-items: center; gap: 6px;">
      <CoarBadge variant="secondary" dot />
      <span style="font-size: 13px; color: #64748b;">Unknown</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CoarBadge } from '@cocoar/vue-ui';
</script>
```

## Pulse Animation

Add a pulse animation to catch the user's eye for time-sensitive updates like new notifications or live events.

**Demo — `badge/demos/BadgePulse.vue`**

```vue
<template>
  <div style="display: flex; flex-wrap: wrap; gap: 16px; align-items: center;">
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <CoarBadge :content="3" variant="error" pulse />
      <span style="font-size: 10px; color: #64748b; font-family: monospace;">PULSING BADGE</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <CoarBadge variant="error" dot pulse />
      <span style="font-size: 10px; color: #64748b; font-family: monospace;">PULSING DOT</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <CoarBadge content="Live" variant="error" pulse size="l" />
      <span style="font-size: 10px; color: #64748b; font-family: monospace;">LIVE INDICATOR</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CoarBadge } from '@cocoar/vue-ui';
</script>
```

## Bordered

The `bordered` prop adds a ring that prevents the badge from visually merging into its parent. Especially useful when badges sit on top of avatars or colored backgrounds.

**Demo — `badge/demos/BadgeBordered.vue`**

```vue
<template>
  <div style="display: flex; flex-wrap: wrap; gap: 16px; align-items: center;">
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <CoarBadge :content="5" bordered />
      <span style="font-size: 10px; color: #64748b; font-family: monospace;">WITH BORDER</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
      <CoarBadge :content="5" />
      <span style="font-size: 10px; color: #64748b; font-family: monospace;">WITHOUT BORDER</span>
    </div>
    <div style="position: relative; display: inline-flex; align-items: flex-end; gap: 6px;">
      <CoarAvatar name="JD" size="l" />
      <CoarBadge :content="3" variant="error" bordered style="position: absolute; top: -4px; right: -4px;" />
      <span style="font-size: 10px; color: #64748b; font-family: monospace; align-self: center; margin-left: 6px;">ON AVATAR</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CoarBadge, CoarAvatar } from '@cocoar/vue-ui';
</script>
```

## Interactive Demo

See badges in action -- increment and reset a notification counter to observe live updates and max-capping behavior.

**Demo — `badge/demos/BadgeInteractive.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <div style="position: relative; display: inline-flex; width: 40px;">
      <span style="font-size: 24px;">&#x1F514;</span>
      <CoarBadge :content="notifCount" :max="99" variant="error" :pulse="pulsing" style="position: absolute; top: -4px; right: -4px;" />
    </div>
    <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
      <CoarButton variant="primary" size="s" @click="notifCount++">Add Notification</CoarButton>
      <CoarButton variant="secondary" size="s" @click="notifCount = 0">Clear All</CoarButton>
    </div>
    <label style="display: flex; align-items: center; gap: 6px; font-size: 13px; color: #64748b; cursor: pointer;">
      <input type="checkbox" v-model="pulsing" />
      Pulse Animation
    </label>
    <p style="margin: 0; font-size: 13px; color: #64748b;">Current count: {{ notifCount }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarBadge, CoarButton } from '@cocoar/vue-ui';

const notifCount = ref(5);
const pulsing = ref(true);
</script>
```

## API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `string \| number` | `''` | Badge content (text or number) |
| `variant` | `'primary' \| 'secondary' \| 'success' \| 'warning' \| 'error' \| 'info'` | `'primary'` | Badge color variant |
| `size` | `'xs' \| 's' \| 'm' \| 'l' \| 'xl'` | `'m'` | Badge size |
| `dot` | `boolean` | `false` | Show as a small dot with no content |
| `max` | `number` | `null` | Cap numeric content (e.g. 100 becomes "99+") |
| `pulse` | `boolean` | `false` | Add pulse animation |
| `bordered` | `boolean` | `false` | Add white border ring |

## i18n Keys

These keys can be translated via [`@cocoar/vue-localization`](../foundations/localization/translations.md).

| Key | Default (English) | Used as |
|-----|-------------------|---------|
| `coar.ui.badge.notificationIndicator` | `'Notification indicator'` | `aria-label` for dot badges (when no `content` value is set) |
