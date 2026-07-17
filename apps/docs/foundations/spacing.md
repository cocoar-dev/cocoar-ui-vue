---
description: "Spacing and effects tokens: the 4 px spacing scale, border radius, stroke widths, and six shadow elevation levels with reference tables."
---

<script setup>
import BorderRadius from './spacing/demos/BorderRadius.vue';
import SpacingScale from './spacing/demos/SpacingScale.vue';
import Shadows from './spacing/demos/Shadows.vue';
</script>

# Spacing & Effects

Layout rhythm, corner shapes, and depth — the visual building blocks that give the system its feel.

## Border Radius

Seven radius tokens shape everything from subtle input rounding to fully circular avatars.

<BorderRadius />

## Spacing Scale

All spacing is built on a **4 px grid**. These tokens control padding, margins, and gaps throughout the system.

<SpacingScale />

## Stroke Width

Border thickness for dividers, outlines, and component borders.

| Token | Value | Use case |
|-------|-------|----------|
| `--coar-stroke-width-xs` | 0.5 px | Hairline dividers |
| `--coar-stroke-width-s` | 1 px | Default borders |
| `--coar-stroke-width-m` | 2 px | Emphasis borders |
| `--coar-stroke-width-l` | 4 px | Heavy accents |

## Shadows & Elevation

Six shadow levels create the illusion of depth. The shadow _is_ the demo — notice how each card lifts further off the surface.

<Shadows />

## Token Reference

### Spacing

| Token | Value | Usage |
|-------|-------|-------|
| `--coar-spacing-xxs` | 2 px | Tight inner gaps |
| `--coar-spacing-xs` | 4 px | Small padding, icon gaps |
| `--coar-spacing-s` | 8 px | Compact padding, list gaps |
| `--coar-spacing-m` | 16 px | Default padding and gaps |
| `--coar-spacing-l` | 24 px | Section padding |
| `--coar-spacing-xl` | 32 px | Large section gaps |
| `--coar-spacing-xxl` | 48 px | Page-level spacing |
| `--coar-spacing-xxxl` | 64 px | Hero / splash spacing |

### Border Radius

| Token | Value |
|-------|-------|
| `--coar-radius-xxs` | 1 px |
| `--coar-radius-xs` | 2 px |
| `--coar-radius-s` | 3 px |
| `--coar-radius-m` | 4 px |
| `--coar-radius-l` | 5 px |
| `--coar-radius-xl` | 6 px |
| `--coar-radius-full` | 999 px |

### Shadows

| Token | Usage |
|-------|-------|
| `--coar-shadow-xs` | Subtle lift for hover states |
| `--coar-shadow-s` | Cards and raised elements |
| `--coar-shadow-m` | Dropdowns and popovers |
| `--coar-shadow-l` | Modals and dialogs |
| `--coar-shadow-xl` | Elevated overlays |
| `--coar-shadow-focus` | Keyboard focus ring |
