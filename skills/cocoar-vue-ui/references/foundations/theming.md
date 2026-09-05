<!-- Generated from apps/docs/foundations/theming.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Theme Editor

The **Theme Editor** is a live token editor built into every Cocoar app. It lets you explore the entire token system — from raw palette shades all the way to semantic roles — and export a ready-to-paste CSS snippet.

> The editor is visible as a small icon in the bottom-right corner of this page. Click it to try everything described here in real time.

## Setup

Add `CoarThemeEditor` to your app's layout. It renders as a floating panel — no wrapper or portal needed.

```ts
import CoarThemeEditor from '@cocoar/vue-ui/theme-editor';
```

```vue
<!-- In your root layout -->
<CoarThemeEditor />
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `hideDarkToggle` | `boolean` | `false` | Hides the light/dark toggle. Set to `true` when your app manages dark mode itself. |

## The Token Tree

Cocoar's token system has three layers. Each layer builds on the one above it.

```
Layer 1 — Primitives
  --coar-color-red-600          oklch-formula of --coar-error

Layer 2 — Semantic
  --coar-background-semantic-error-bold   → var(--coar-color-red-600)

Layer 3 — Component
  --coar-button-danger-bg                 → var(--coar-background-semantic-error-bold)
```

Changing a primitive ripples through semantic tokens, which ripple through every component that uses them. The Theme Editor exposes all three layers.

## Tabs

### Presets

Four built-in starting points: **Enterprise** (default), **Modern SaaS** (rounded), **Playful** (pill buttons, vivid accent), and **Minimal** (sharp corners, no shadows). Selecting a preset resets all other tabs to the preset's values.

### Brand

Sets the five base hue values that anchor the entire palette:

| Token | Default | Purpose |
|-------|---------|---------|
| `--coar-accent` | `#1183CD` | Primary actions, links, focus rings |
| `--coar-success` | `#1e8f48` | Positive feedback |
| `--coar-error` | `#d63b3b` | Errors, destructive actions |
| `--coar-warning` | `#cc821f` | Caution |
| `--coar-info` | `#5e6b84` | Neutral informational |

Each color opens a **palette editor** (floating panel) where you can fine-tune the L (lightness) and C (chroma) for individual steps 50–900 using oklch relative color syntax.

### Semantic

Maps semantic roles to palette entries. Each row shows the resolved color, lets you pick a palette (Accent / Red / Green / Amber / Slate) and a step (50–900), and has a reset button that turns accent-colored when changed.

This is the layer that connects intent to color: `--coar-background-semantic-error-bold` points at `Red / 600` by default. Reassigning it to `Amber / 600` would make all error surfaces amber — including form field borders, toast backgrounds, and the danger button — without touching any component code.

### Corners

Controls the global radius scale (`xxs` → `xl`) plus per-component-group overrides for buttons, inputs, cards, menus, popovers, dialogs, and toasts. Select from named scale steps or `Full` (pill shape).

### Type

Font family for body text and headings, chosen from a curated list of Google Fonts. Fonts load on demand when selected.

### Spacing

Component density slider: **Compact** (0.75×), **Default** (1×), or **Comfortable** (1.33×). Scales horizontal padding on all interactive components.

### Depth

Box shadow per component group (buttons never have shadows; cards, menus, dialogs, and toasts do).

### Motion

A single duration multiplier that scales all `--coar-duration-*` tokens proportionally. Set to 0 for instant transitions, or push it above 2× to slow everything down for testing.

## Exporting

Type a class name into the name field at the bottom of the editor (default: `custom`), then click **Download CSS** to get a scoped block containing only the tokens you changed:

```css
/* coar-theme--myapp.css */
.coar-theme--myapp {
  --coar-accent: #7C3AED;
  --coar-button-radius: var(--coar-radius-m);
  --coar-input-radius: var(--coar-radius-m);
}
```

Drop it into your app after the Cocoar stylesheet and apply the class to your root element:

```html
<!-- index.html -->
<html class="coar-theme--myapp">
<head>
  <link rel="stylesheet" href="@cocoar/vue-ui/styles" />
  <link rel="stylesheet" href="/coar-theme--myapp.css" />
</head>
```

Or import in your entry file:

```ts
import '@cocoar/vue-ui/styles';
import './coar-theme--myapp.css';
```

Because themes are classes, you can apply different themes to different subtrees:

```html
<html class="coar-theme--myapp">
  <!-- most of the app uses the custom theme -->

  <div class="coar-theme--compact">
    <!-- this section uses a separate theme -->
  </div>

  <div class="coar-theme-none">
    <!-- this section always uses library defaults -->
  </div>
</html>
```

### `.coar-theme-none`

The library ships a built-in reset class. Apply `.coar-theme-none` to any element to restore all themeable tokens to their library defaults inside that subtree, regardless of what theme class is set on an ancestor. Useful for "always default" widgets like admin panels or embedded forms.
