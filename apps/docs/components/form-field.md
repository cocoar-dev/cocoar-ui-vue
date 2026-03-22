# Form Field

A wrapper component that provides a label, hint text, and error message around any form control. Instead of each input managing its own label and validation display, `CoarFormField` handles these concerns in one place.

```ts
import { CoarFormField } from '@cocoar/vue-ui';
```

## Basic Usage

Wrap any form control in `CoarFormField` and pass `label`, `hint`, or `error` props. The label is automatically associated with the input inside via generated IDs.

<preview path="./form-field/demos/FormFieldBasic.vue" />

## Grouping Controls

Use `CoarFormField` to add a group label and shared error to a set of checkboxes or radio buttons. Each checkbox keeps its own inline `label` prop for the option text.

<preview path="./form-field/demos/FormFieldCheckboxGroup.vue" />

## Registration Form

A complete registration form with submit-on-click validation. Errors only appear after the user attempts to submit.

<preview path="./form-field/demos/FormRegistration.vue" />

## Settings Panel

A settings page using every form control type — text inputs, textareas, selects, checkboxes, radio groups, and switches — all wrapped in `CoarFormField` for consistent layout.

<preview path="./form-field/demos/FormSettings.vue" />

## Validation with vee-validate

`CoarFormField` integrates seamlessly with [vee-validate](https://vee-validate.logaretm.com/) and [Zod](https://zod.dev/) schemas. Use `useField()` to get reactive `value` and `errorMessage` refs, then bind them to the input and `CoarFormField` respectively.

<preview path="./form-field/demos/FormVeeValidate.vue" />

::: tip Other validation libraries
`CoarFormField` is library-agnostic — it just takes an `error` string. Any validation approach works: vee-validate, vuelidate, or plain computed properties.
:::

## Standalone Form Controls

Form controls work without `CoarFormField` when no label or validation is needed — inline search inputs, table checkboxes, toolbar buttons.

```vue
<!-- No label needed -->
<CoarTextInput v-model="search" placeholder="Search..." />

<!-- Inline checkbox with its own label -->
<CoarCheckbox v-model="agree" label="I agree" />
```

## Accessibility

`CoarFormField` generates unique IDs automatically:

- **Label**: `<label for="...">` points to the input — clicking the label focuses the control
- **Error/Hint**: linked via `aria-describedby` — screen readers announce the message on focus
- **Required**: asterisk is `aria-hidden="true"` — use `required` on the input for semantics

## API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | `undefined` | Label text displayed above the input |
| `error` | `string` | `''` | Error message — overrides hint when set |
| `hint` | `string` | `''` | Hint text displayed below the input |
| `required` | `boolean` | `false` | Show required asterisk next to label |
| `disabled` | `boolean` | `false` | Disabled state — propagated to child inputs |
| `id` | `string` | auto | Explicit input ID (auto-generated if omitted) |

### Slots

| Slot | Description |
|------|-------------|
| `default` | The form control(s) to wrap |
