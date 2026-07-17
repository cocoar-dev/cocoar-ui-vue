---
description: "CoarSpinner — animated loading indicator for operations of unknown duration, with four sizes, accessible labels and full-page overlay patterns"
---

# Spinner

Spinners signal that something is loading when you can't show a progress bar. They tell users "we're working on it" for network requests, lazy-loaded content, or any asynchronous operation with an unpredictable duration.

```ts
import { CoarSpinner } from '@cocoar/vue-ui';
```

## Basic Spinner

Drop in a spinner wherever content is still loading. It animates continuously until you remove it or swap in the real content.

<preview path="./spinner/demos/SpinnerBasic.vue" />

## Sizes

Four sizes to fit any context -- `xs` for inline loading indicators next to text, up to `l` for full-page or overlay states.

<preview path="./spinner/demos/SpinnerSizes.vue" />

## With Loading Text

Pair a spinner with a descriptive message so users know what's being loaded, not just that something is happening.

<preview path="./spinner/demos/SpinnerWithText.vue" />

## Full Page Overlay

Center a spinner in a container overlay to block interaction while critical data loads. This pattern works well for initial page loads and modal content.

<preview path="./spinner/demos/SpinnerOverlay.vue" />

## API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `'xs' \| 's' \| 'm' \| 'l'` | `'m'` | Spinner size |
| `label` | `string` | `'Loading'` | Accessible label for screen readers |
