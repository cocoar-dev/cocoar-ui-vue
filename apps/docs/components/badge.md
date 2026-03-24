# Badge

Badges draw attention to counts, statuses, or short labels. Attach them to icons, avatars, or buttons to surface information that needs a quick glance -- like unread messages, plan tiers, or live/offline indicators.

```ts
import { CoarBadge } from '@cocoar/vue-ui';
```

## Variants

Six semantic variants let you match the badge to its meaning -- use `success` for positive states, `error` for alerts, and so on.

<preview path="./badge/demos/BadgeVariants.vue" />

## Sizes

Five sizes from tiny `xs` (great for inline status) to bold `xl` (ideal for dashboard counters).

<preview path="./badge/demos/BadgeSizes.vue" />

## Text Content

Badges aren't limited to numbers. Use short text labels like "New", "Beta", or "Pro" to tag features and content.

<preview path="./badge/demos/BadgeText.vue" />

## Max Value

Set a `max` to cap large numbers gracefully. Perfect for notification counts where "99+" is more useful than "1,247".

<preview path="./badge/demos/BadgeMax.vue" />

## Dot Mode

When you only need to signal presence or status without a specific value, `dot` mode provides a minimal, color-coded indicator.

<preview path="./badge/demos/BadgeDot.vue" />

## Pulse Animation

Add a pulse animation to catch the user's eye for time-sensitive updates like new notifications or live events.

<preview path="./badge/demos/BadgePulse.vue" />

## Bordered

The `bordered` prop adds a ring that prevents the badge from visually merging into its parent. Especially useful when badges sit on top of avatars or colored backgrounds.

<preview path="./badge/demos/BadgeBordered.vue" />

## Interactive Demo

See badges in action -- increment and reset a notification counter to observe live updates and max-capping behavior.

<preview path="./badge/demos/BadgeInteractive.vue" />

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

These keys can be translated via [`@cocoar/vue-localization`](/foundations/localization/translations).

| Key | Default (English) | Used as |
|-----|-------------------|---------|
| `coar.ui.badge.notificationIndicator` | `'Notification indicator'` | `aria-label` for dot badges (when no `content` value is set) |
