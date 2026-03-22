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

All components work with **touch and focus** — hover is an enhancement, not a requirement. This is **tablet-first** design: touch interaction with desktop-appropriate information density. Not mobile-first — mobile phones have different constraints (small screens, portrait orientation, one-handed use). Tablets have similar screen real estate to laptops but use touch instead of mouse.

- Minimum **44 x 44 px** touch targets on all interactive elements
- Appropriate tap spacing to prevent accidental activation
- No hover-only interactions — every feature is reachable via tap or keyboard
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
