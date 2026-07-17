---
description: "Cocoar's two-layer color system: primitive palettes and semantic tokens that adapt to light and dark mode, with naming convention and full token reference."
---

<script setup>
import ColorPrimitives from './colors/demos/ColorPrimitives.vue';
import SemanticColors from './colors/demos/SemanticColors.vue';
import ColorUsageExample from './colors/demos/ColorUsageExample.vue';
</script>

# Colors

Cocoar's color system is built on two layers: **primitives** (the raw palette) and **semantic tokens** (purpose-driven aliases). Semantic tokens adapt to light and dark mode automatically — always use them in your components instead of referencing primitives directly.

## Color Primitives

Six scales, ten shades each. These are the building blocks that semantic tokens reference under the hood.

<ColorPrimitives />

::: tip When to use primitives
Almost never. Use semantic tokens in component code. Primitives are useful only when defining new semantic tokens or building one-off illustrations.
:::

## Semantic Colors

Semantic tokens give colors *meaning* — background, text, border, or status — so your UI stays consistent and adapts to theme changes without touching component code.

<SemanticColors />

## Usage Example

A realistic card built entirely with semantic tokens. Toggle light/dark mode to see every color adapt.

<ColorUsageExample />

## Token Naming Convention

All tokens follow a predictable pattern:

```
--coar-{usage}-{category}-{variant}
```

| Segment | Values | Examples |
|---------|--------|----------|
| **Usage** | `background`, `text`, `border`, `icon` | What the color is applied to |
| **Category** | `neutral`, `brand`, `accent`, `semantic-{status}` | The color family |
| **Variant** | `primary`, `secondary`, `tertiary`, `bold`, `subtle`, `hover`, `active`, `disabled` | Emphasis level or state |

## Token Reference

### Background

| Token | Usage |
|-------|-------|
| `--coar-background-neutral-primary` | Default page / card surface |
| `--coar-background-neutral-secondary` | Slightly raised surface |
| `--coar-background-neutral-tertiary` | Subtle fill for inputs, hover states |
| `--coar-background-accent-primary` | Primary accent (buttons, active states) |
| `--coar-background-accent-secondary` | Lighter accent fill |
| `--coar-background-accent-tertiary` | Subtlest accent fill |
| `--coar-background-accent-hover` | Accent hover state |
| `--coar-background-accent-active` | Accent pressed state |
| `--coar-background-brand-primary` | Brand-colored surface |
| `--coar-background-brand-secondary` | Lighter brand surface |
| `--coar-background-brand-tertiary` | Subtlest brand surface |

### Text

| Token | Usage |
|-------|-------|
| `--coar-text-neutral-primary` | Primary body text |
| `--coar-text-neutral-secondary` | Supporting / secondary text |
| `--coar-text-neutral-tertiary` | Placeholder, hint text |
| `--coar-text-neutral-disabled` | Disabled text |
| `--coar-text-accent-primary` | Accent-colored text (links, highlights) |
| `--coar-text-accent-secondary` | Lighter accent text |
| `--coar-text-brand-primary` | Brand-colored text |
| `--coar-text-on-bold` | White text on bold / colored surfaces |

### Border

| Token | Usage |
|-------|-------|
| `--coar-border-neutral-primary` | Strong border (emphasis) |
| `--coar-border-neutral-secondary` | Default visible border |
| `--coar-border-neutral-tertiary` | Subtle divider |
| `--coar-border-accent-primary` | Accent border (focus rings) |
| `--coar-border-accent-secondary` | Lighter accent border |
| `--coar-border-input` | Input field border |
| `--coar-border-input-hover` | Input border on hover |

### Status

| Token | Usage |
|-------|-------|
| `--coar-background-semantic-success-bold` | Success background (solid) |
| `--coar-background-semantic-success-subtle` | Success background (light) |
| `--coar-background-semantic-error-bold` | Error background (solid) |
| `--coar-background-semantic-error-subtle` | Error background (light) |
| `--coar-background-semantic-warning-bold` | Warning background (solid) |
| `--coar-background-semantic-warning-subtle` | Warning background (light) |
| `--coar-background-semantic-info-bold` | Info background (solid) |
| `--coar-background-semantic-info-subtle` | Info background (light) |
| `--coar-text-semantic-success-bold` | Success text (strong) |
| `--coar-text-semantic-error-bold` | Error text (strong) |
| `--coar-text-semantic-warning-bold` | Warning text (strong) |
| `--coar-text-semantic-info-bold` | Info text (strong) |
