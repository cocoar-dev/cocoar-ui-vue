# Theming

Cocoar uses an **oklch-based** color system. You set a few base colors, and the entire palette — including all shades for light and dark mode — is auto-calculated.

## Quick Start

Override the CSS custom properties on `:root` to match your brand:

```css
:root {
  --coar-accent: #1183CD;   /* Your brand color → primary buttons, links, focus rings */
}
```

That's it. All accent shades (50–900), in both light and dark mode, recalculate from this single value.

## Customizable Base Colors

| Variable | Default | Purpose |
|----------|---------|---------|
| `--coar-accent` | `#1183CD` | Brand/accent color — primary buttons, active states, links |
| `--coar-success` | `#1e8f48` | Success states — confirmations, positive feedback |
| `--coar-error` | `#d63b3b` | Error states — validation errors, destructive actions |
| `--coar-warning` | `#cc821f` | Warning states — caution, attention needed |
| `--coar-info` | `#5e6b84` | Info states — neutral informational context |

### Example: Red Brand

```css
:root {
  --coar-accent: #C41E3A;   /* Red brand */
  --coar-error:  #8B0000;   /* Darker red so errors are distinguishable */
}
```

### Example: Purple Brand

```css
:root {
  --coar-accent: #7C3AED;
}
```

## How It Works

Each base color generates a 10-step shade scale using **oklch relative color syntax**:

```css
/* You set this: */
--coar-accent: #1183CD;

/* The library calculates these: */
--coar-color-accent-50:  oklch(from var(--coar-accent) 0.97 0.012 h);  /* lightest */
--coar-color-accent-100: oklch(from var(--coar-accent) 0.92 0.035 h);
--coar-color-accent-200: oklch(from var(--coar-accent) 0.84 0.075 h);
/* ... */
--coar-color-accent-500: var(--coar-accent);                            /* = your exact color */
/* ... */
--coar-color-accent-900: oklch(from var(--coar-accent) 0.31 0.095 h);  /* darkest */
```

The `h` (hue) is extracted from your color. Lightness and chroma follow a designed curve that keeps shades vibrant instead of washed out. `accent-500` is always your exact brand color.

This works because **oklch is perceptually uniform** — unlike HSL, a lightness of 0.5 in oklch looks equally "medium" for blue, red, and yellow.

## Fine-Tuning Individual Shades

If an auto-calculated shade doesn't look right for your specific color, override it:

```css
:root {
  --coar-accent: #FF6600;

  /* Auto-calculated 50 too warm? Override just that one: */
  --coar-color-accent-50: #FFF5EB;
}
```

## Dark Mode

Dark mode shades are calculated from the same base variables — no need to set anything extra. The library uses a separate lightness/chroma curve designed for dark backgrounds:

- Low numbers (50–200): dark with a subtle color tint
- Mid range (300–500): vibrant and saturated
- High numbers (600–900): lighter for text on dark backgrounds

The primary button color (`accent-500`) stays identical in both modes.

## Browser Support

The oklch color system requires:
- Chrome 119+
- Firefox 128+
- Safari 18+

This covers all modern browsers. For older browsers, consider providing hex fallbacks for your specific brand color.
