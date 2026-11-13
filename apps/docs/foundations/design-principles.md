---
description: "The six Cocoar Design System principles — clarity, consistency, accessibility, touch-first, performance, developer experience — plus the stability promise for web apps, the design token architecture and do's and don'ts."
---

# Design Principles

The foundation of the Cocoar Design System — six principles that guide every design decision across our Vue 3 component library.

---

### Clarity

Every element has a clear purpose. Reduce visual noise and make the important thing obvious.

- Consistent spacing creates visual rhythm that guides scanning
- Typography hierarchy directs attention to what matters most
- Limit each view to one primary action to reduce decision fatigue
- Use whitespace generously — empty space is not wasted space

---

### Consistency

Use the same patterns, tokens, and components everywhere. Predictability reduces cognitive load and builds trust.

- Shared token vocabulary across colors, spacing, radius, and motion
- Uniform component API patterns — props, events, and slots follow conventions
- Consistent interaction models — similar controls behave identically
- One way to do things, not many — fewer choices lead to better outcomes

---

### Accessibility

Design for everyone. Meet WCAG AA standards at minimum. Keyboard navigation is not optional — it is a core feature.

- **4.5 : 1** minimum contrast ratio for all text content
- Full keyboard navigation built into every interactive component
- Screen reader support with proper ARIA attributes
- Focus indicators that are visible and consistent
- Respect `prefers-reduced-motion` for users who need it

---

### Touch-First

Components are designed to work with **touch and focus** — hover is meant as an enhancement, not a requirement. This is **tablet-first** design: touch interaction with desktop-appropriate information density. Not mobile-first — mobile phones have different constraints (small screens, portrait orientation, one-handed use). Tablets have similar screen real estate to laptops but use touch instead of mouse.

- The default presentation follows the size scale of the design tokens: `xs` 27 px, `s` 32 px, `m` 40 px, `l` 48 px high
- The [mobile presentation](/guide/mobile) (`.coar-mobile`) raises the adapted controls to at least 44 px, with 44 × 44 px targets for their actions
- The phone presentation is an **opt-in**: tablet-first stays the default, and nothing switches by viewport width or device detection
- **Appearance follows the class, behaviour follows the input**: `.coar-mobile` changes sizes only; how a component reacts (hover, drag, gestures) depends on the input the browser reports, never on the class
- Appropriate tap spacing to prevent accidental activation
- No hover-only interactions — every feature is reachable via tap or keyboard; where a component does not meet this yet, the device line under its title says so
- Use dimmed states instead of hiding; on focus/hover elements become prominent
- Desktop gets additional polish (hover states) as progressive enhancement

---

### Performance

Ship less, load faster. Icons are inlined SVGs. Components are tree-shakeable. CSS theming uses custom properties for zero runtime cost.

- Inline SVG icons eliminate icon font overhead
- Individual component imports enable dead-code elimination
- CSS custom property theming — no JavaScript at render time
- Lightweight component architecture with minimal dependencies

---

### Developer Experience

Strong TypeScript types. Composable APIs. Predictable naming. The system should be a joy to use, not a chore to learn.

- Full TypeScript support with exported types for every component
- Consistent `v-model` patterns across all form controls
- Self-documenting prop names — no guessing what `mode="3"` means
- Composable utilities (`useDialog`, `useToast`) for programmatic control

---

## Stability promise for web apps

What runs without `.coar-mobile` keeps its look and behaviour. Mobile work does not change web apps that do not ask for it:

- **Mobile work is opt-in** — through the `.coar-mobile` class for appearance, or through a new prop or option whose default is today's behaviour. New tokens default to today's value.
- **It is checked, not just promised** — the playground has visual baselines of the default presentation, compared pixel for pixel on every pull request. A changed default image is merged only with the maintainer's explicit approval.
- **A second presentation, not a rebuilt one** — a component whose phone interaction is fundamentally different gets a second presentation next to the existing one instead of a rebuilt desktop view.
- **Preview first, breaking changes only in a major** — new features carry the Preview badge, and breaking changes come only with a major version.
- **The exception is a bug fix** — it may change what is visible, and is then listed as a fix in the release notes.

### Known legacy

A few places react today to the viewport width or the primary pointer instead of an opt-in. They stay as they are:

- `@cocoar/vue-ui/styles` (`base.css`) scales the title and heading sizes down below 1024 px and again below 768 px viewport width.
- The panels of `CoarPlainDatePicker`, `CoarPlainDateTimePicker` and `CoarZonedDateTimePicker` stack their parts and become scrollable below 540 px viewport width.
- `CoarNotice` banners wrap and reduce their padding below 640 px viewport width.
- `CoarCalendar` lets its view switcher take a full row below 48rem viewport width, in addition to the same rule by container width.
- The translations panel of `CoarPageBuilder` stacks its header and toolbar below 820 px viewport width.
- `useDragDrop` with `engine: 'auto'` picks the pointer engine when the primary pointer is coarse (`(pointer: coarse)`) and the native HTML5 engine otherwise. The default engine is `'native'`.

## Design Token Architecture

Cocoar uses a **two-layer token system**: raw primitives are referenced by semantic tokens. Always use semantic tokens in your components — they adapt automatically to light and dark mode.

| Category | Token Prefix | Description |
|---|---|---|
| **Color** | `--coar-color-*` | Raw color primitives (gray, slate, accent, green, red, amber) |
| **Background** | `--coar-background-*` | Semantic surface tokens for accent, brand, neutral, and status |
| **Text** | `--coar-text-*` | Text color tokens for all states and emphasis levels |
| **Border** | `--coar-border-*` | Border color tokens for interactive and structural elements |
| **Spacing** | `--coar-spacing-*` | Space scale from `xxs` (2 px) to `xxxl` (64 px) on a 4 px grid |
| **Radius** | `--coar-radius-*` | Border radius from `xxs` (1 px) to `full` (999 px) |
| **Shadow** | `--coar-shadow-*` | Elevation shadows `xs`–`xl` plus a focus ring |
| **Typography** | `--coar-titles-*` / `--coar-headings-*` / `--coar-body-*` | Font family, size, and weight tokens for each text role |
| **Motion** | `--coar-duration-*` / `--coar-ease-*` / `--coar-transition-*` | Duration, easing, and pre-composed transition tokens |

## Do's and Don'ts

::: tip Do
- Use semantic tokens — `--coar-text-neutral-primary`, not a raw hex value
- Follow the **4 px spacing grid** for all layout dimensions
- Use `v-model` for two-way binding on form controls
- Import components individually for tree-shaking: `import { CoarButton } from '@cocoar/vue-ui'`
- Test keyboard navigation for every interactive flow
- Provide `aria-label` for icon-only buttons
:::

::: danger Don't
- Hardcode colors or spacing values in component styles
- Use primitive tokens directly in components (`--coar-color-gray-500`)
- Override component internals with `:deep()` selectors
- Create hover-only interactions that exclude touch and keyboard users
- Mix spacing values that are not on the 4 px grid
- Ignore `prefers-reduced-motion` in custom animations
:::

::: info Dark Mode
Toggle dark mode by adding the `.dark-mode` class to `document.documentElement`. All tokens and components update automatically — no JavaScript required at render time.
:::
