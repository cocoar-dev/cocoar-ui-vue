# Typography

Our type system creates clear visual hierarchy and ensures readability across all interfaces. Eleven styles cover everything from large display headings to fine-print footnotes.

## Type Scale

Each row shows the style rendered at its actual size, with font metadata alongside.

<preview path="./typography/demos/TypeScale.vue" />

## Usage Example

Typography hierarchy applied to a realistic article layout — caption, title, subtitle, body, and footnote working together.

<preview path="./typography/demos/TypographyExample.vue" />

## CSS Classes Reference

Apply these utility classes directly to any HTML element.

| Class | Role | Font | Size | Weight |
|---|---|---|---|---|
| `.coar-display` | Display | Inter | 72 px | Bold |
| `.coar-title` | Title | Inter | 48 px | Bold |
| `.coar-subtitle` | Subtitle | Inter | 32 px | Regular |
| `.coar-heading` | Heading | Poppins | 24 px | SemiBold |
| `.coar-subheading` | Subheading | Poppins | 20 px | Regular |
| `.coar-body` | Body | Poppins | 16 px | Regular |
| `.coar-body-bold` | Body Bold | Poppins | 16 px | Bold |
| `.coar-body-small` | Body Small | Poppins | 14 px | Regular |
| `.coar-body-small-bold` | Body Small Bold | Poppins | 14 px | Bold |
| `.coar-caption` | Caption | Poppins | 12 px | Medium, Uppercase |
| `.coar-footnote` | Footnote | Poppins | 10 px | Regular |

## Usage

```html
<h1 class="coar-title">Page Title</h1>
<p class="coar-subtitle">Supporting subtitle text</p>
<p class="coar-body">Main body content goes here.</p>
<span class="coar-caption">LABEL TEXT</span>
```

::: tip Font Loading
The type scale uses **Inter** for display-level text and **Poppins** for body and UI text. Make sure both fonts are loaded before rendering to avoid layout shift.
:::
