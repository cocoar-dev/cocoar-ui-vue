# Spinner

Spinners signal that something is loading when you can't show a progress bar. They tell users "we're working on it" for network requests, lazy-loaded content, or any asynchronous operation with an unpredictable duration.

```ts
import { CoarSpinner } from '@cocoar/vue-ui';
```

## Basic Spinner

Drop in a spinner wherever content is still loading. It animates continuously until you remove it or swap in the real content.

<preview path="./spinner/demos/SpinnerBasic.vue" />

## Sizes

Five sizes to fit any context -- `xs` for inline loading indicators next to text, up to `xl` for full-page or overlay states.

<preview path="./spinner/demos/SpinnerSizes.vue" />

## Colors

By default the spinner inherits the current text color. Override it with the `color` prop to use semantic tokens or any CSS color value.

<preview path="./spinner/demos/SpinnerColors.vue" />

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
| `size` | `'xs' \| 's' \| 'm' \| 'l' \| 'xl'` | `'m'` | Spinner size |
| `color` | `string` | `'currentColor'` | Spinner color (any CSS color value) |
