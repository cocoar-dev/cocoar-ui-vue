---
description: "CoarOtpInput — N-cell one-time-code input with auto-advance, paste spreading, numeric/alphanumeric/text modes, masking, transform/accept hooks and a complete event"
---

# OTP Input <Badge type="tip" text="New in 2.0" />

The N-cell input for verification codes — 2FA / TOTP from authenticator apps, SMS one-time passwords, claim codes, short PINs. Auto-advances as the user types, jumps back on Backspace, spreads pasted codes across cells, and fires a `complete` event the moment the last cell fills so you can submit without a button click.

```ts
import { CoarOtpInput, CoarFormField } from '@cocoar/vue-ui';
```

## Basic Usage

Wire it up with `v-model` and listen to `@complete` for auto-submit. The value is the assembled string — `"123456"` once all six cells are filled.

<preview path="./otp-input/demos/BasicOtpInput.vue" />

## Length

The default 6 cells match TOTP / SMS codes (RFC 6238). For shorter PINs or longer backup codes, override with the `length` prop.

<preview path="./otp-input/demos/OtpInputLength.vue" />

## Type

`type="numeric"` (the default) rejects non-digits at the keystroke level and tells mobile browsers to open the numeric keyboard via `inputmode="numeric"`. `"alphanumeric"` accepts `[A-Za-z0-9]` for claim / recovery codes. `"text"` accepts any single character.

`mask` renders the cells as `<input type="password">` — the value is visually hidden while the keyboard interaction stays normal. Useful for PINs or sensitive codes in shared-screen contexts.

<preview path="./otp-input/demos/OtpInputTypes.vue" />

## Custom filtering: `transform` and `accept`

The built-in `type` classes (`numeric` / `alphanumeric` / `text`) cover the common cases, but real codes have quirks. Two hooks let you fine-tune per character without losing the rest of the input pipeline:

- **`transform(char) => string`** — runs FIRST. Rewrites a character before it's committed. Return a different char to substitute, return `''` to drop. Classic use: `c => c.toUpperCase()` so the user can type lowercase but the code stays canonical.
- **`accept(char) => boolean`** — runs AFTER `type` + `transform`. Reject characters the built-in class would otherwise allow. Classic use: block visually-ambiguous chars in printed claim codes so `O` (letter) and `0` (number) don't get confused.

Both hooks fire on every keystroke AND on every character of a pasted string — paste-spread runs through the same sanitizer, so a clipboard payload of `"abc123"` ends up as `"ABC123"` if `transform` uppercases.

<preview path="./otp-input/demos/OtpInputTransform.vue" />

## Validation

Drop the OTP input inside `CoarFormField` and the error state flows in automatically — the field's red ring + error message work the same as any other input. The `@complete` event is your "user finished typing" signal; verify against your backend and surface the result via `error`.

<preview path="./otp-input/demos/OtpInputValidation.vue" />

## Sizes

Four sizes match the rest of the form-input family (`CoarTextInput`, `CoarNumberInput`, etc.) — `xs` / `s` / `m` (default) / `l`. Cell width tracks the size token, so the OTP input lines up vertically with neighbouring inputs in a form.

<preview path="./otp-input/demos/OtpInputSizes.vue" />

## Behavior

| Interaction | Result |
|---|---|
| Type a character in cell `i` | Cell fills, focus auto-advances to `i + 1`. |
| Backspace on a filled cell | Clears the cell (stays put). |
| Backspace on an empty cell | Jumps to `i − 1` and clears it. |
| Delete on a filled cell | Clears the cell (stays put). |
| Arrow Left / Right | Moves focus between cells. |
| Home / End | First / last cell. |
| Type into a filled cell | Replaces its content (selection ensures overwrite). |
| Paste `"123456"` in cell 0 | Spreads across cells 0–5. Strips chars that don't match `type`. |
| Paste a 6-char code in cell 2 | Spreads from cell 2 onward, stopping at the last cell. |
| All cells filled | Fires `@complete` with the assembled string. |
| Tab | Moves focus *out* of the group from any cell — the entire OTP input is one tab-stop in practice. |

### Mobile SMS autofill

The first cell carries `autocomplete="one-time-code"` by default, so iOS and Android offer the SMS autofill chip when a verification text arrives. Override via the `autocomplete` prop if your app uses a different signal (`autocomplete="off"` to opt out entirely).

## API

### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `modelValue` (`v-model`) | `string` | `''` | The assembled code. Partial fills work — `"12"` means cells 0–1 are filled, the rest empty. |
| `length` | `number` | `6` | Number of cells. |
| `type` | `'numeric' \| 'alphanumeric' \| 'text'` | `'numeric'` | Character class accepted per cell. |
| `mask` | `boolean` | `false` | Render cells as `type="password"`. |
| `autoFocus` | `boolean` | `false` | Focus the first cell on mount. |
| `size` | `'xs' \| 's' \| 'm' \| 'l'` | `'m'` | Cell size — matches the form-input family. |
| `disabled` | `boolean` | `false` | Disable all cells. |
| `readonly` | `boolean` | `false` | All cells read-only. |
| `required` | `boolean` | `false` | Marks the group as required (picked up by `CoarFormField`). |
| `error` | `boolean` | `false` | Error state. Auto-injected from `CoarFormField`. |
| `placeholder` | `string` | `''` | Single-char placeholder shown in empty cells. |
| `id` | `string` | _auto_ | HTML `id` for the first cell (and aria reference target). |
| `name` | `string` | `''` | HTML `name` prefix — each cell gets `${name}-${i}`. |
| `autocomplete` | `string` | `'one-time-code'` | First cell's `autocomplete` value. |
| `transform` | `(char: string) => string` | _none_ | Rewrite a character before commit. Return `''` to drop. Runs before `type` + `accept`. |
| `accept` | `(char: string) => boolean` | _none_ | Per-character accept predicate ANDed with `type`. Return `false` to reject. |

### Events

| Event | Payload | Notes |
|---|---|---|
| `update:modelValue` | `string` | Standard `v-model` emit. |
| `complete` | `string` | All cells filled — assembled string. Wire to your verify call. |
| `focused` | `FocusEvent` | A cell gained focus. |
| `blurred` | `FocusEvent` | A cell lost focus. |

## Accessibility

- The component is a `role="group"` with `aria-label="Verification code, N digits"`.
- Each cell is a real `<input>` with `aria-label="Digit i of N"` so screen readers announce position.
- `aria-invalid` propagates to every cell when the error state is set.
- Cell focus is keyboard-driven (Tab into the first cell, arrows / auto-advance inside, Tab out at any cell).
- Mobile screen readers respect the per-cell input semantics — the SMS-autofill chip on iOS Safari also targets the first cell correctly.
