# Migrating to 2.11

The 2.11 release unifies the whole input family onto one internal shell
(`CoarInputFrame`) and a single field-padding token. **Visually almost nothing
changes** — padding and sizing values were preserved — and the public props and
slots of the text / number / password / select family are unchanged.

For most apps the migration is **one search-and-replace or nothing at all**. The
checklist below is ordered by how likely it is to affect you.

## TL;DR

| If you… | …then you need to |
| --- | --- |
| Use the **date / time pickers** with a `label`, `hint`, or `error="message"` | Wrap them in [`CoarFormField`](/components/form-field) (see below). **The only real code change.** |
| Rely on the **auto clear ✕** on text / number / password / date inputs | Add the `clearable` prop where you want it. |
| **Override `--coar-input-padding-x`** in your own CSS | Rename it to `--coar-field-padding-x`. |
| **Use `--coar-spacing-2xs` / `-xxl` / `-xxxl`** in your own CSS | Switch `2xs → xxs`; pick another step for `xxl` / `xxxl`. |
| None of the above | **Nothing — you're done.** |

---

## 1. Date & time pickers move onto `CoarFormField`

The biggest change. `CoarPlainDatePicker`, `CoarPlainDateTimePicker` and
`CoarZonedDateTimePicker` no longer render their own label, required asterisk, or
below-field hint/error message, and they no longer take `label` / `hint` props.
Their `error` prop is now a **`boolean`** (it flips the red border + `aria-invalid`),
matching `CoarTextInput` and the rest of the field family.

Wrap them in [`CoarFormField`](/components/form-field) — exactly like every other
input — to get the label, the required `*`, validation messages and the inline
status icon. This also **fixes** a latent bug where a `CoarFormField`-wrapped
picker didn't pick up the error border.

**Before:**

```vue
<CoarPlainDatePicker
  v-model="date"
  label="Start date"
  hint="When the project kicks off"
  :error="errorMessage"
  required
/>
```

**After:**

```vue
<CoarFormField
  label="Start date"
  hint="When the project kicks off"
  :error="errorMessage"
  required
>
  <CoarPlainDatePicker v-model="date" :error="!!errorMessage" />
</CoarFormField>
```

Notes:

- `error` on the **picker** is now a boolean — pass `!!errorMessage` (or any
  boolean). The human-readable message lives on `CoarFormField`.
- New `id` prop on each picker (explicit input id; otherwise taken from the
  wrapping `CoarFormField`, otherwise auto-generated) for parity with the other
  inputs.

## 2. `clearable` is now opt-in (defaults to `false`)

`CoarTextInput`, `CoarPasswordInput`, `CoarNumberInput` and the three date/time
pickers previously defaulted `clearable` to `true`. They now default to `false`,
in line with the library rule that **every boolean prop defaults `false`** (and
matching `CoarSelect` / `CoarMultiSelect`, which were already `false`).

Nothing errors — the inline clear ✕ simply no longer appears unless you ask for it.

**Before** (✕ shown automatically):

```vue
<CoarTextInput v-model="name" />
```

**After** (add `clearable` where you want the ✕):

```vue
<CoarTextInput v-model="name" clearable />
```

`@cocoar/vue-data-grid` is unaffected — its cell editors already pass `clearable`
explicitly.

## 3. Renamed / removed CSS tokens

These only affect you if you **override Cocoar design tokens** in your own
stylesheet. If you consume the components as-is, skip this section.

### Renamed

| Old | New |
| --- | --- |
| `--coar-input-padding-x` | `--coar-field-padding-x` |

`--coar-field-padding-x` (`12px`) is the single source of truth for form-field
horizontal padding. It is intentionally **off** the spacing scale and decoupled
from it, so tuning `--coar-spacing-*` no longer moves field padding. Each control
size scales it by `--coar-component-{xs,s,m,l}-scale`.

### Removed

| Removed | Use instead |
| --- | --- |
| `--coar-spacing-2xs` (was a duplicate of `xxs`, both `2px`) | `--coar-spacing-xxs` |
| `--coar-spacing-xxl` (`48px`, unused in the library) | a remaining step, e.g. `--coar-spacing-xl` (`32px`) |
| `--coar-spacing-xxxl` (`64px`, unused in the library) | a remaining step |

The spacing scale is now: `3xs 1 · xxs 2 · xs 4 · s 8 · m 16 · l 24 · xl 32`.

---

## What did **not** change

- **Public props & slots** of `CoarTextInput`, `CoarPasswordInput`,
  `CoarNumberInput`, `CoarSelect`, `CoarMultiSelect`, `CoarTagSelect` — including
  the `prefix` / `suffix` / `leading` / `trailing` slots. The move onto the
  internal `CoarInputFrame` shell is invisible to consumers.
- **Visual output** — padding, radius and sizing values were preserved. Fields
  may differ by a sub-pixel at most; nothing reflows.
- **Toggle, listbox and segmented controls** — `CoarCheckbox`, `CoarSwitch`,
  `CoarRadioGroup`, `CoarListbox`, `CoarDualListbox`, `CoarSegmentedControl` got
  token-consistency polish only, no API change. (`CoarSwitch` and
  `CoarRadioGroup` additionally **gain** an `xs` size — additive.)
