---
description: "CoarThemeEditor, a live token editor: explore primitive, semantic, and component token layers, apply presets, and export a CSS snippet."
---

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

Mounted inside a `.coar-compact` area (the compatibility entry of the Preview
[compact presentation](./compact-presentation)), the editor targets that area rather than a
neighboring default area. Its teleported tools keep that area's presentation. The editor remains a
single live editor per document.

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

Five built-in starting points: **Enterprise** (default), **Modern SaaS** (rounded), **Playful** (pill buttons, vivid accent), **Minimal** (sharp corners, no shadows) and **Compact** <Badge type="warning" text="Preview" /> (smaller Inter text, Slate surfaces, 36 px controls). Selecting a preset resets all other tabs to the preset's values.

A preset is a set of values, nothing else. All presets use the same tokens and the same derivations; no preset adds a class to your page. **Compact** is the [compact presentation](./compact-presentation) as such a set: selecting the card loads its values into the editor without reloading the page, and every tab keeps working on top of them.

### Values of this theme

Shown while **Compact** is loaded. It lists the values the preset sets, in three groups: typography (body, action, field and caption text), sizes (control heights, row height, paddings, radii) and surfaces and text as a light and a dark colour each. Change any of them independently; the reset button of a row restores the value of the loaded preset.

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

Font family for body text and headings, chosen from a short list: Poppins, Inter, Onest, DM Sans, Nunito, Geist and the system font. The editor only names the family; a font shows once your app loads it. The library self-hosts three entries, none of which loads anything from a CDN: `@cocoar/vue-ui/fonts` (Poppins, Inter 400 and 700, Cascadia Code), `@cocoar/vue-ui/fonts/compact` (Inter 400 to 700) and `@cocoar/vue-ui/fonts/onest` (Onest 400 to 700). Load the other families yourself.

### Spacing

Component density slider: **Compact** (0.75×), **Default** (1×), or **Comfortable** (1.33×). Scales horizontal padding on all interactive components.

### Depth

Box shadow per component group (buttons never have shadows; cards, menus, dialogs, and toasts do).

### Motion

A single duration multiplier that scales all `--coar-duration-*` tokens proportionally. Set to 0 for instant transitions, or push it above 2× to slow everything down for testing.

## Resetting

The reset button of a control restores the value of the loaded preset. **Reset** in the header removes everything the editor changed and nothing else: the theme your app has without the editor shows again. Light or dark mode, `.coar-mobile`, other theme scopes and the state of your app are left as they are.

## Exporting

Type a class name into the name field at the bottom of the editor (default: `custom`), then click **Download CSS**. The live preview and the download are the same CSS, written for another class. Starting from a preset that only changes the default look, you get a scoped block containing only the tokens you changed:

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

### Exporting a theme based on Compact

With **Compact** loaded, the file contains every value a fresh app needs, with your changes in place, not only the differences against a preset the app would not have:

```css
/* coar-theme--myapp.css (shortened) */
@layer cocoar.tokens {
  .coar-theme--myapp {
    --coar-role-derivation: ;            /* derive the dependent tokens from these values */
    --coar-theme-accent: #334155;
    --coar-font-family-body: var(--coar-appearance-font-body, DM Sans, ui-sans-serif, system-ui, sans-serif);
    --coar-ui-font-size: 13px;
    --coar-component-m-height: 36px;
    /* … */
  }

  .coar-mobile .coar-theme--myapp,
  .coar-theme--myapp.coar-mobile,
  .coar-theme--myapp .coar-mobile {
    --coar-interactive-row-height: 44px; /* touch sizes where the theme meets .coar-mobile */
    /* … */
  }
}
```

`--coar-role-derivation` (an empty value) is what makes the library derive palette steps, aliases and component roles from the values of the theme, on its class and on the scopes nested in it. The app needs the theme class and this file, loaded after the Cocoar stylesheet; it does not need `.coar-compact`. Dark mode and `.coar-mobile` stay separate choices of the app and combine with the theme.

The file is written into the cascade layer of the library's tokens, where `.coar-compact` is too. Your own unlayered styles therefore keep the last word, exactly as with the class: the theme sets body text to 14 px on its scope, and an app that declares `html { font-size: 16px }` itself keeps its 16 px (and the `rem` sizes that follow from it).

The file names a font, it does not ship one. Load the font your theme uses yourself: `import '@cocoar/vue-ui/fonts/compact'` for the Inter weights of the Compact preset, `import '@cocoar/vue-ui/fonts/onest'` for Onest, or your own `@font-face` rules for another family.

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
