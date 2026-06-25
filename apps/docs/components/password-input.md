# Password Input

A text input tailored for passwords. It masks characters by default and provides a built-in eye toggle so users can temporarily reveal what they typed -- reducing frustration without sacrificing security.

```ts
import { CoarPasswordInput } from '@cocoar/vue-ui';
```

## Basic Usage

Works just like a text input, but the value is masked. Click the eye icon to peek at the password.

<preview path="./password-input/demos/BasicPasswordInput.vue" />

## With Validation

Wrap in `CoarFormField` to add labels, hints, and error messages. The component reads the error state from the field context automatically.

<preview path="./password-input/demos/PasswordInputValidation.vue" />

## States

Use `disabled` for locked accounts or `readonly` when displaying a masked placeholder that the user cannot modify.

<preview path="./password-input/demos/PasswordInputStates.vue" />

## Sizes

Four sizes to keep password fields visually consistent with the rest of your form.

<preview path="./password-input/demos/PasswordInputSizes.vue" />

## Accessibility

### Keyboard Navigation

| Key | Action |
|-----|--------|
| `Tab` | Move focus to input / toggle button |
| `Enter` / `Space` | Toggle password visibility (on eye icon) |

::: info
The visibility toggle button has an accessible label that updates based on the current state ("Show password" / "Hide password").
:::

### Screen Reader Support

- Label text announces on focus
- Password visibility toggle state is communicated
- Error messages linked via `aria-describedby`
- Input type switches between `password` and `text`

## API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `v-model` | `string` | `''` | Password value |
| `placeholder` | `string` | `''` | Placeholder text |
| `error` | `boolean` | `false` | Error state (auto-injected from `CoarFormField`) |
| `size` | `'xs' \| 's' \| 'm' \| 'l'` | `'m'` | Input size |
| `disabled` | `boolean` | `false` | Disable the input |
| `readonly` | `boolean` | `false` | Make read-only |
| `required` | `boolean` | `false` | Mark as required |
| `clearable` | `boolean` | `false` | Show clear button when input has value |

## i18n Keys

These keys can be translated via [`@cocoar/vue-localization`](/foundations/localization/translations).

| Key | Default (English) | Used as |
|-----|-------------------|---------|
| `coar.ui.passwordInput.showPassword` | `'Show password'` | Toggle visibility button `aria-label` |
| `coar.ui.passwordInput.hidePassword` | `'Hide password'` | Toggle visibility button `aria-label` (when visible) |
| `coar.ui.passwordInput.clear` | `'Clear'` | Clear button `aria-label` |
