---
description: "Opt into the mobile presentation with a coar-mobile parent: touch-sized controls, what decides sizes, layout and input behaviour, how it combines with brand themes, and which device classes each component supports."
---

# Mobile presentation <Badge type="warning" text="Preview" />

::: warning Preview — new in 3.2
The mobile presentation is new in 3.2 and still a Preview: token names and the
set of adapted controls may change before it loses this mark.
:::

Add `coar-mobile` to `html`, `body`, or a local parent to opt into a mobile
presentation. Import the normal `@cocoar/vue-ui/styles` stylesheet; no extra
plugin, component props, or mobile-specific components are required.

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { CoarButton, CoarFormField, CoarTextInput } from '@cocoar/vue-ui';

const name = ref('');
</script>

<template>
  <div class="coar-mobile">
    <CoarFormField label="Name">
      <CoarTextInput v-model="name" clearable />
    </CoarFormField>
    <CoarButton>Save</CoarButton>
  </div>
</template>
```

For an entire iOS/Android app or a deliberately mobile web interface:

```ts
document.body.classList.add('coar-mobile');
```

The class is an explicit **presentation preference**, not a claim that a mouse or
keyboard is unavailable. Existing click events, keyboard handling, `v-model`,
validation, disabled/readonly states, and link-button semantics stay unchanged.
Connecting a mouse does not switch the presentation. Narrowing the viewport does
not automatically enable this mode either.

## What decides what

Each aspect of how a component looks and behaves has one source. They are
independent of each other:

| Aspect | Decided by |
|--------|------------|
| Brand: colours, fonts, shapes | The app's theme (`--coar-*` tokens, see [Theming](/guide/theming)) |
| Colour scheme | The `dark-mode` class on the root element |
| Control sizes | The `coar-mobile` class |
| Layout in the available space | The size of the component's container — for example `CoarCalendar` and the month list view use CSS container queries, and the day view's multi-day variation derives its number of columns from the container width |
| Input behaviour: hover effects, drag engine | The input the browser reports — for example `CoarDataList` shows row hover only under `(hover: hover)`, and `useDragDrop` with `engine: 'auto'` uses its pointer engine on a coarse pointer |

Some cases:

- **A tablet with a mouse** in an app that sets `coar-mobile` keeps the mobile
  sizes. Whether hover effects appear depends on what the browser reports for
  the device (`(hover: hover)`), never on the class.
- **A narrow desktop window** does not get phone sizes. Only the class changes
  sizes; components whose container gets narrow adapt their layout where they
  support it.
- **A touch notebook** without the class keeps the desktop sizes. Touch works,
  but the controls are not enlarged.

## A mode, not a theme

Under `coar-mobile` the library's stylesheet sets only `--coar-control-*`
tokens (`packages/ui/styles/tokens/mobile.css`): heights, minimum target sizes,
the minimum editable font size and the visibility of clear buttons. Apart from
that, the input frame paints its border without taking layout space. No colour,
radius or font family changes, so a brand theme applies in both modes unchanged.

The control tokens are ordinary inherited custom properties, so the usual
cascade decides which value a control gets: the nearest ancestor that sets a
token wins, and on the same element the more specific selector, then the later
rule. There is no fixed order between the mode and a brand theme beyond that.

A brand that wants its own mobile sizes therefore sets them with a selector
that includes the class:

```css
/* brand and mode on the same element, e.g. <html class="my-brand coar-mobile"> */
.my-brand.coar-mobile {
  --coar-control-m-height: 56px;
}

/* a local mobile area inside the brand */
.my-brand .coar-mobile {
  --coar-control-m-height: 56px;
}
```

A brand rule without the class is the wrong tool: it either loses against
`.coar-mobile` or, where it wins, changes the desktop presentation too, because
the controls read these tokens in both modes.

## Supported controls

This is the first mobile-controls increment, not a mobile redesign of the entire
library.

| Component | Mobile presentation |
|-----------|---------------------|
| `CoarButton` | Size-dependent mobile heights (below), at least 44px width and 16px text; includes icon-only, loading, and link buttons |
| `CoarTextInput` | The same mobile height scale and at least 16px editable text, including multiline textareas |
| `CoarPasswordInput` | The same field floors, plus 44×44px clear/reveal targets |
| `CoarNumberInput` | The same field floors, plus 44×44px clear and stepper targets |
| `CoarCheckbox` | At least 48×48px clickable label, without enlarging the indicator |
| `CoarRadioButton` / `CoarRadioGroup` | At least 48×48px clickable option labels, without enlarging the indicators |
| `CoarSwitch` | At least 48×48px clickable label, without enlarging the track |

Text-input clear buttons also receive 44×44px targets. Clear buttons remain fully
opaque without hover or focus when a value can be cleared; empty fields retain
their hidden action slot to avoid layout jumps.

The existing `size` prop selects a different height scale in mobile mode instead
of collapsing every size to one minimum:

| Size | Desktop token height | Mobile height |
|------|----------------------|---------------|
| `xs` | 27px | 44px |
| `s` | 32px | 48px |
| `m` | 40px | 52px |
| `l` | 48px | 56px |

This scale applies to buttons and single-line text/password/number fields;
textareas can grow taller. Larger custom component heights are preserved.
The mobile input border is painted without taking layout space, so even an `xs`
field can contain 44px actions under a global `box-sizing: border-box` reset.
Rounded fields still have intentionally rounded hit regions.

A 16px editable font is intended to avoid the usual small-input focus zoom
on iOS, but actual keyboard and zoom behavior still requires device testing.

## Scope and themes

The mode inherits through ordinary DOM descendants, including `CoarThemeScope`.
It is independent of light/dark mode. Removing the class restores normal sizing
without remounting the controls or resetting their values. Desktop siblings
outside a local mobile parent are unaffected.

**Portaled content is not automatically part of a local mobile scope.** Overlays
teleported to `body` leave that parent's DOM subtree. Use `coar-mobile` on `body`
or `html` when supported controls inside overlays should also use the mode.
This increment does not add a mobile-context bridge for local overlays.

Date/time pickers, select panels, dialogs, OTP inputs, grids, and editors do not
have dedicated mobile presentations in this increment. In particular,
`CoarZonedDateTimePicker` does not yet switch to a sheet or a stepped mobile flow.

The class changes sizes only. A component without a mobile presentation keeps
its own layout in both modes (see [Device support](#device-support)); adapted
controls inside it, such as the buttons of a dialog, still take the mobile
sizes. A component that
needs a different pattern on a phone will get an explicit option for it; no
component changes its behaviour or layout pattern because the class is present.

## Customizing the floors

The mode sets inherited control tokens rather than changing the library's shared
desktop size tokens. Applications can override them locally:

```css
.my-mobile-form.coar-mobile {
  --coar-control-xs-height: 48px;
  --coar-control-s-height: 52px;
  --coar-control-m-height: 56px;
  --coar-control-l-height: 60px;
  --coar-control-min-font-size: 18px;
  --coar-control-min-target-size: 48px;
}
```

`--coar-control-min-size` separately controls the minimum clickable label size
for checkboxes, radios, and switches (48px by default).

Leave enough horizontal room for the field and its actions, especially for
password fields with both clear/reveal buttons and number fields with steppers.

The playground's `/mobile-controls` page demonstrates every size, local scope
switching, nested themes, textarea behavior, and non-editable states.

## Device support {#device-support}

Every component page states, under its title, how far it supports three device
classes:

- **Desktop** — mouse and keyboard.
- **Tablet** — touch without hover, in the default presentation.
- **Phone** — touch on a narrow screen, with `coar-mobile`.

Each class has one of four values:

| Value | Meaning |
|-------|---------|
| `ready` | Everything the page documents is reachable with that device's input and fits its width. On the phone an interactive component also needs a mobile presentation under `coar-mobile` that has left Preview. |
| `partial` | The main purpose works; the note on the page names the limit. |
| `planned` | Not adapted yet; an adaptation is planned. |
| `no` (shown as "not supported") | Not meant for this device. |

In a page's frontmatter this is one line, `devices: { desktop: ready, tablet: ready, phone: partial }`,
with a `devicesNote` when a value is `partial` or `no`.

The values state the result of design and code review. Automated touch tests
are only being added, and testing on real devices remains the job of the app.

<DeviceMatrix />
