# Transitions

Pre-built Vue `<Transition>` wrappers that use the design system's motion tokens. Drop them in, toggle visibility, done — durations, easing, and `prefers-reduced-motion` are handled automatically.

```ts
import { CoarFade, CoarSlide, CoarScale, CoarCollapse } from '@cocoar/vue-ui';
```

## Fade

Simple opacity transition. Use for overlays, tooltips, and content toggling.

<preview path="./transitions/demos/FadeDemo.vue" />

## Slide

Slides content in from a direction with a subtle opacity fade. Use for dropdowns, drawers, and notification panels.

<preview path="./transitions/demos/SlideDemo.vue" />

## Scale

Scales content in with a slight bounce and fades out cleanly. Use for dialogs, popovers, and action confirmations.

<preview path="./transitions/demos/ScaleDemo.vue" />

## Collapse

Animates the actual height of content for smooth expand/collapse. Use for accordions, expandable sections, and progressive disclosure.

<preview path="./transitions/demos/CollapseDemo.vue" />

## Accessibility

All transition components respect `prefers-reduced-motion: reduce`. When the user has reduced motion enabled, the design system's duration tokens collapse to `0ms`, making all transitions instant.

## API

### Shared Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `duration` | `'fast' \| 'normal' \| 'slow'` | `'normal'` | Maps to `--coar-duration-*` tokens (100ms / 200ms / 300ms) |
| `appear` | `boolean` | `false` | Animate on initial render |

### CoarSlide Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `direction` | `'up' \| 'down' \| 'left' \| 'right'` | `'down'` | Slide direction |

### Slots

All transition components have a single default slot. The child element must support `v-if` or `v-show` for the transition to work.

```vue
<CoarFade>
  <div v-if="visible">I fade in and out</div>
</CoarFade>
```
