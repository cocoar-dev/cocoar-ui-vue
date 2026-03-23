# Error Handling

Cocoar UI components are designed to fail gracefully. Internal errors are either caught and recovered silently, or surfaced to the user through controlled feedback mechanisms. This guide explains the patterns used throughout the library and how to handle errors in your own application code.

## Library Philosophy: Fail Gracefully

Components never throw unhandled exceptions into your application. Instead they follow one of two patterns:

- **Silent fallback** — return a safe default (`null`, `'UTC'`, `false`) and continue
- **User feedback** — surface the error visibly via a Toast or state change

## Overlay Promises

`CoarDialog` and `CoarPopconfirm` return Promises. Always handle the rejection case:

```ts
import { useDialog } from '@cocoar/vue-ui';

const dialog = useDialog();

// ✅ Always add .catch()
dialog.confirm({
  title: 'Delete item',
  message: 'This cannot be undone.',
})
  .then((confirmed) => {
    if (confirmed) deleteItem();
  })
  .catch(() => {
    // Dialog was closed unexpectedly (e.g. overlay destroyed before user responded)
  });
```

With async/await:

```ts
try {
  const confirmed = await dialog.confirm({ title: 'Delete item', message: '...' });
  if (confirmed) await deleteItem();
} catch {
  // Handle unexpected close
}
```

::: tip Popconfirm
`CoarPopconfirm` emits `@confirmed` and `@cancelled` events — no Promise handling needed there. Use it for simple inline confirmations, and reserve `useDialog()` for programmatic flows where error handling is more important.
:::

## Toast for Error Feedback

Use `useToast().error()` to surface errors to the user. Error toasts are persistent by default (duration `0`) — they stay until the user dismisses them, which is appropriate for errors that require attention.

```ts
import { useToast } from '@cocoar/vue-ui';

const toast = useToast();

async function saveData() {
  try {
    await api.save(payload);
    toast.success('Saved successfully');
  } catch (err) {
    toast.error('Save failed', {
      message: err instanceof Error ? err.message : 'Please try again.',
    });
  }
}
```

```ts
// With a retry action
toast.error('Connection lost', {
  message: 'Could not reach the server.',
  action: {
    label: 'Retry',
    callback: () => saveData(),
  },
});
```

## Date and Time Parsing

Date parsing functions return `null` on failure instead of throwing. Always null-check the result before using it:

```ts
import { coarParsePlainDate } from '@cocoar/vue-ui';

const date = coarParsePlainDate(userInput);

if (date === null) {
  // Input was invalid — show validation error
  toast.error('Invalid date format');
  return;
}

// date is a Temporal.PlainDate — safe to use
processDate(date);
```

The date picker components handle this internally — invalid input simply doesn't update the model value. Your `v-model` will remain `null` until the user enters a valid date.

## Timezone Fallbacks

Timezone utilities default to `'UTC'` when the browser API fails or the timezone identifier is unrecognised. This keeps date/time components functional even in restricted environments:

```ts
import { useTimezone } from '@cocoar/vue-localization';

const { timezone } = useTimezone();
// Always a valid IANA identifier — 'UTC' as last resort
```

## Async Operations in Overlays

When loading data inside a Dialog or Popover, manage loading and error states yourself:

```vue
<script setup>
import { ref } from 'vue';
import { useDialog, useToast } from '@cocoar/vue-ui';

const dialog = useDialog();
const toast = useToast();

async function openEditDialog(id: string) {
  let data;
  try {
    data = await fetchItem(id);
  } catch {
    toast.error('Could not load item');
    return; // Don't open the dialog if data failed to load
  }

  const saved = await dialog.confirm({
    title: 'Edit item',
    // ... pass data to dialog body component
  }).catch(() => false);

  if (saved) {
    try {
      await saveItem(data);
      toast.success('Saved');
    } catch {
      toast.error('Save failed');
    }
  }
}
</script>
```

## Pattern Summary

| Situation | Recommended pattern |
|-----------|---------------------|
| Dialog/Popconfirm result | `.then().catch()` or `try/await/catch` |
| API call in component | `try/catch` + `toast.error()` |
| Date input validation | Null-check return value of parse functions |
| Non-recoverable error | `toast.error()` with persistent duration (default) |
| Recoverable error | `toast.error()` with `action: { label: 'Retry', callback }` |
| Silent failures OK | Rely on library defaults (`null`, `'UTC'`, `false`) |
