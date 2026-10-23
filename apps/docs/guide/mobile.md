---
description: "Opt into mobile presentation with a coar-mobile parent: touch-sized buttons, text/password/number inputs, checkboxes, radios and switches without changing component APIs."
---

# Mobile presentation

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
The class is the entry point for those future presentations, not a promise that
all components are already adapted.

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
