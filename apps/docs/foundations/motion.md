---
description: "Motion design tokens: duration and easing CSS variables plus pre-composed transition values, with interactive demos and usage examples."
---

<script setup>
import DurationDemo from './motion/demos/DurationDemo.vue';
import EasingDemo from './motion/demos/EasingDemo.vue';
import TransitionDemo from './motion/demos/TransitionDemo.vue';
</script>

# Motion

Timing, easing, and pre-composed transitions that make the UI feel responsive and alive.

## Duration

How long an animation takes. Short durations suit small changes; longer ones give complex movements room to breathe. Press **Play** to see each duration side by side.

<DurationDemo />

## Easing

How animations accelerate and decelerate. Press **Play** to compare every curve at the same duration.

<EasingDemo />

## Pre-composed Transitions

Ready-made `transition` values that pair a duration with an easing curve. Hover each button to see the effect it controls.

<TransitionDemo />

## Usage

### Basic transition

```css
.my-element {
  transition: var(--coar-transition-default);
}
```

### Custom transition with tokens

```css
.my-element {
  transition:
    background-color var(--coar-duration-normal) var(--coar-ease-out),
    transform var(--coar-duration-fast) var(--coar-ease-bounce);
}
```

### Animation with duration

```css
@keyframes slide-in {
  from { transform: translateY(-8px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}

.my-element {
  animation: slide-in var(--coar-duration-normal) var(--coar-ease-out);
}
```

## Accessibility

All motion tokens respect the `prefers-reduced-motion` media query. When a user opts for reduced motion, every duration collapses to `0 ms` — transitions become instant and nothing moves unexpectedly.

```css
@media (prefers-reduced-motion: reduce) {
  :root {
    --coar-duration-fast:    0ms;
    --coar-duration-normal:  0ms;
    --coar-duration-slow:    0ms;
    --coar-duration-slower:  0ms;
    --coar-duration-slowest: 0ms;
  }
}
```

::: info
Always use COAR duration tokens instead of hardcoded values. This ensures animations are automatically disabled for users who prefer reduced motion.
:::

## Token Reference

### Duration

| Token | Value | Usage |
|-------|-------|-------|
| `--coar-duration-instant` | 0 ms | No animation (immediate) |
| `--coar-duration-fast` | 100 ms | Micro-interactions, hover states |
| `--coar-duration-normal` | 200 ms | Most transitions |
| `--coar-duration-slow` | 300 ms | Complex state changes |
| `--coar-duration-slower` | 400 ms | Large movements |
| `--coar-duration-slowest` | 600 ms | Page-level transitions |

### Easing

| Token | Usage |
|-------|-------|
| `--coar-ease-linear` | Constant speed — for opacity, color |
| `--coar-ease-out` | Fast start, slow end — most UI motion |
| `--coar-ease-in` | Slow start, fast end — dismissals |
| `--coar-ease-in-out` | Slow start and end — complex motions |
| `--coar-ease-bounce` | Elastic overshoot — playful feedback |

### Pre-composed Transitions

| Token | Usage |
|-------|-------|
| `--coar-transition-default` | General-purpose transition |
| `--coar-transition-fast` | Quick micro-interactions |
| `--coar-transition-colors` | Background and text color changes |
| `--coar-transition-transform` | Scale, rotate, translate |
| `--coar-transition-opacity` | Show / hide transitions |
| `--coar-transition-shadow` | Elevation changes on hover |
