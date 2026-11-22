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
| `hideDarkToggle` | `boolean` | `false` | Hides the light/dark toggle. Set to `true` when your app manages dark mode itself; the editor then edits the colours of the scheme your app shows. |
| `fontPreview` | `boolean` | `true` | Fetches a font chosen in the editor from Google Fonts when the page does not have it, to preview it. See [Type](#type). |

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

A preset is a complete set of values on the same token contract. Modern SaaS, Playful and Minimal start from Enterprise and supply their own differences; Compact supplies the [compact presentation](./compact-presentation). Selecting a card loads its values without reloading the page, and every tab works on top of them. The editor starts with Enterprise, or Compact when mounted inside `.coar-compact`, but applies nothing to the app until you make a change.

### Values of this theme

Available for **every preset**. It lists the model's values in three groups: typography (body, action, field and caption text), sizes (control heights, row height, paddings, radii) and surfaces and text as a light and a dark colour each. Change any of them independently; the reset button of a row restores the value of the loaded preset. Every preset can be exported as a standalone stylesheet, including before any edit.

### Brand

Sets the five base hue values that anchor the entire palette:

| Token | Default | Purpose |
|-------|---------|---------|
| `--coar-accent` | `#1183CD` | Primary actions, links, focus rings |
| `--coar-success` | `#1e8f48` | Positive feedback |
| `--coar-error` | `#d63b3b` | Errors, destructive actions |
| `--coar-warning` | `#cc821f` | Caution |
| `--coar-info` | `#5e6b84` | Neutral informational |

**Light and dark** <Badge type="warning" text="Preview" />. The Appearance switch at the top of the tab chooses the scheme you see and the one you edit. Every colour of the editor is calculated until you set it:

- A base colour is set in light. In dark it is locked and follows the light colour (or the dark half the preset gives it); unlock it to choose another dark colour, lock it again to follow light.
- Under each base colour, **Aa** shows the text on its solid fill (a primary button, a status badge) with its APCA contrast (Lc). The text colour is calculated for the best contrast in both schemes; unlock it to choose one. Below Lc 60 the editor warns that the text is hard to read; it never refuses the colour.

Each colour opens a **palette editor** (floating panel) for the scheme you edit, where you fine-tune L (lightness) and C (chroma) of every step 50–900, step 500 included, in oklch. A step you set is written as its `-lc` or `-lc-dark` input; the other scheme keeps its curve.

#### Base colours per scheme (Preview)

A value-based theme accepts one colour for both schemes, or a `light-dark()` pair,
through `--coar-theme-accent`, `--coar-theme-success`, `--coar-theme-error`,
`--coar-theme-warning` and `--coar-theme-info`. These inputs survive nested
light/dark boundaries and are carried into teleported overlays. For example,
over an exported theme:

```css
.coar-theme--acme {
  --coar-theme-accent: light-dark(#1183cd, #facc15);
  --coar-theme-success: light-dark(#15803d, #0d9488);
  --coar-color-green-600-lc-dark: 0.8 0.08;
}
```

Each palette step has its own `-lc` and `-lc-dark` input, including step 500
(`l c` preserves the base colour). The four status palettes use `green`, `red`,
`amber` and `slate` in their token names. Existing base and palette overrides
keep working; `CoarThemeScope` inputs still take precedence over preset values.
The Brand tab writes exactly these inputs, and only those you set.

### Semantic

Text on a solid accent or status fill uses its own computed role:
`--coar-text-on-accent`, `--coar-text-on-success`, `--coar-text-on-error`,
`--coar-text-on-warning` and `--coar-text-on-info` (Preview). Each chooses white or
black by APCA, with or without a preset. A theme can override a role with any
colour or a `light-dark()` pair; text on neutral or tinted surfaces remains
palette-derived. See [text on saturated fills](/foundations/colors#text-on-saturated-fills-preview)
and the [migration note](/guide/migration-color-roles).

Maps semantic roles to palette entries, for the scheme you edit. Each row shows the resolved color, lets you pick a palette (Accent / Red / Green / Amber / Slate) and a step (50–900), and has a reset button that turns accent-colored when changed. A role you set in one scheme keeps its default in the other; set in both, it is exported as a `light-dark()` pair.

This is the layer that connects intent to color: `--coar-background-semantic-error-bold` points at `Red / 600` by default. Reassigning it to `Amber / 600` would make all error surfaces amber — including form field borders, toast backgrounds, and the danger button — without touching any component code.

### Corners

Controls the global radius scale (`xxs` → `xl`) plus per-component-group overrides for buttons, inputs, cards, menus, popovers, dialogs, and toasts. Select from named scale steps or `Full` (pill shape).

### Type

Font family for body text and headings. Choose Poppins, Inter, Onest, DM Sans, Nunito, Geist or the system font from the list, or **Other font…** to type any family name.

**Trying a font without installing it.** When the page does not have the family you chose or typed, the editor fetches it from Google Fonts to show it, and says so under the field. This is a preview only:

- The downloaded theme names the font and does not contain it. The file starts with a comment that lists each font and what your app has to load for it.
- The request goes to Google and carries the IP address of whoever uses the editor. It happens only for a font chosen in the editor, never when the editor mounts. Switch it off with `:font-preview="false"`; a font the page lacks then shows its fallback.
- A name Google Fonts does not know shows only where that font is installed on the device.

The library self-hosts three font entries, none of which loads anything from a CDN: `@cocoar/vue-ui/fonts` (Poppins, Inter 400 and 700, Cascadia Code), `@cocoar/vue-ui/fonts/compact` (Inter 400 to 700) and `@cocoar/vue-ui/fonts/onest` (Onest 400 to 700). Load any other family yourself, self-hosted or from your font provider.

### Spacing

Component density slider: **Compact** (0.75×), **Default** (1×), or **Comfortable** (1.33×). Scales horizontal padding on all interactive components.

### Depth

Box shadow per component group (buttons never have shadows; cards, menus, dialogs, and toasts do).

### Motion

A single duration multiplier that scales all `--coar-duration-*` tokens proportionally. Set to 0 for instant transitions, or push it above 2× to slow everything down for testing.

## Resetting

The reset button of a control restores the value of the loaded preset; a lock does the same for a colour of one scheme. **Reset** in the header removes everything the editor changed, in light and in dark, and nothing else: the theme your app has without the editor shows again. Light or dark mode, `.coar-mobile`, other theme scopes and the state of your app are left as they are.

## Exporting

Type a class name into the name field at the bottom of the editor (default: `custom`), then click **Download CSS**. The live preview and the download are the same CSS, written for another class. Whatever preset you start from, the file contains every value a fresh app needs, with your changes in place, not only the differences against a preset the app would not have. A colour you left locked is written as its calculation; one you set is written as its value, or as a `light-dark()` pair where light and dark differ:

```css
/* coar-theme--myapp.css (shortened) */
@layer cocoar.tokens {
  .coar-theme--myapp {
    --coar-role-derivation: ;            /* derive the dependent tokens from these values */
    --coar-theme-accent: light-dark(#7c3aed, #a78bfa); /* a dark accent you unlocked */
    --coar-color-accent-600-lc-dark: 0.72 0.12;         /* a palette step you set in dark */
    --coar-font-family-body: var(--coar-appearance-font-body, Inter, ui-sans-serif, system-ui, sans-serif);
    --coar-ui-font-size: 13px;
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

`--coar-role-derivation` (an empty value) is what makes the library derive palette steps, aliases and component roles from the values of the theme, on its class and on the scopes nested in it. The app needs the theme class and this file, loaded after the Cocoar stylesheet; it does not need `.coar-compact`. Dark mode and `.coar-mobile` stay separate choices of the app and combine with the theme.

The calendar derives its `--coar-calendar-*` tokens on its outermost element, so with an active theme a value on a wrapper does not arrive. Put the class of a calendar skin on the component, `<CoarMonthView class="my-skin" />`: a rule on that element wins. `--coar-role-derivation: initial` on a wrapper also lets the values through, but it turns off the derivation for every component inside it, vue-ui included.

The file is written into the cascade layer of the library's tokens, where `.coar-compact` is too. Your own unlayered styles therefore keep the last word, exactly as with the class: the theme sets body text to 14 px on its scope, and an app that declares `html { font-size: 16px }` itself keeps its 16 px (and the `rem` sizes that follow from it).

The file names a font, it does not ship one, and it starts with a comment saying what to load. Load the font your theme uses yourself: `import '@cocoar/vue-ui/fonts/compact'` for the Inter weights of the Compact preset, `import '@cocoar/vue-ui/fonts/onest'` for Onest, or your own `@font-face` rules for another family.

Because themes are classes, you can apply different themes to different subtrees:

> [!WARNING]
> Reliable isolation of **different nested presets** uses CSS `@scope` and requires
> Firefox 146+ (Chrome/Edge 119+ and Safari 18+ already support it). Older browsers
> retain the single-preset fallback, but outer preset values can leak into an inner
> preset. This does not raise the requirements for an ordinary single preset or
> light/dark switching. See [browser compatibility](../guide/theming#different-presets-inside-one-another-preview),
> including the Safari 26.0–26.3 native-field caveat. Put theme and mode classes on containers.

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