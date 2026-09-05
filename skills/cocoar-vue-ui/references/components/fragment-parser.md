<!-- Generated from apps/docs/components/fragment-parser.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Fragment Parser & Modal Routing

Parse URL fragments (hash portion) into structured routes with parameters. Combined with composables, this enables **deep-linkable modals** — open modals via URL, share links, and use browser back to close them.

> **Info: Separate Package**
>
```bash
pnpm add @cocoar/vue-fragment-parser
```

```ts
import {
  parseFragment,            // Core parser
  useFragmentNavigation,    // navigateToModal(), closeModal()
  useRoutedFragments,       // Reactive fragment parsing
  useRoutedModals,          // Auto dialog/modal from URL
  type DialogFragment,      // type: 'dialog' route config
  type ModalFragment,       // type: 'modal' route config
} from '@cocoar/vue-fragment-parser';
```

## Basic Usage

Define routes with path patterns and parse the current URL fragment:

```ts
import { parseFragment, type RoutedFragmentBase } from '@cocoar/vue-fragment-parser';

interface AppRoute extends RoutedFragmentBase {
  type: string;
  path: string | string[];
  options?: { requiresAuth?: boolean };
}

const routes: AppRoute[] = [
  { type: 'overview', path: 'overview' },
  { type: 'details', path: 'details/:id' },
  { type: 'edit', path: 'details/:id/edit' },
];

// URL: https://app.com/#details/42?tab=comments
const result = parseFragment('#details/42?tab=comments', routes);
// → [{ route: { type: 'details', ... }, params: { id: '42', tab: 'comments' }, fragment: '...' }]
```

## Path Parameters

Use `:param` syntax for dynamic segments (powered by `path-to-regexp`):

```ts
const routes = [
  { type: 'user', path: 'user/:userId' },
  { type: 'project', path: 'project/:projectId/task/:taskId' },
];

// #user/abc → params: { userId: 'abc' }
// #project/1/task/42 → params: { projectId: '1', taskId: '42' }
```

## Query Parameters

Query parameters are parsed automatically with JSON type coercion:

```ts
// #details/5?edit=true&count=3
// → params: { id: '5', edit: true, count: 3 }

// #overview?tags=["a","b"]
// → params: { tags: ['a', 'b'] }
```

## Multiple Fragments

Chain multiple fragments with `#` for composable routing:

```ts
// #details/5#confirm?force=true
const results = parseFragment('#details/5#confirm?force=true', routes);
// → Two parsed routes: details + confirm
```

## Array Paths

A single route can match multiple paths:

```ts
const routes = [
  { type: 'docs', path: ['overview', 'usage', 'examples'] },
];

// #overview → matches docs route
// #usage → matches docs route
// #examples → matches docs route
```

## Modal Routing

The fragment parser's main use case: **deep-linkable modals**. When a user double-clicks a grid row, the modal opens AND the URL updates. Copy-pasting that URL opens the same modal. Browser back closes it.

```
/todos                → just the list
/todos#todo-42        → list + detail modal for todo-42
/todos#todo-42?tab=2  → list + detail modal, comments tab selected
```

### How It Works

Three composables work together:

```
User clicks row
    ↓
navigateToModal('todo-42')         ← useFragmentNavigation
    ↓
URL changes to /todos#todo-42
    ↓
useRoutedFragments detects change  ← useRoutedFragments
    ↓
Parses fragment against routes
    ↓
useRoutedModals opens dialog       ← useRoutedModals
    ↓
User closes dialog (or browser back)
    ↓
Fragment removed from URL
```

### Step 1: Define Fragment Routes

Register which fragments should open components in your Vue Router config. Two types are supported:

- **`type: 'dialog'`** — Opens inside a `CoarDialog` shell (header, title, close button)
- **`type: 'modal'`** — Opens as a raw overlay (no shell, your component IS the entire modal)

```ts
// routes.ts
import type { RoutedOverlayFragment } from '@cocoar/vue-fragment-parser';

const routes = [
  {
    path: '/todos',
    component: () => import('./TodoList.vue'),
    meta: {
      routedFragments: [
        {
          type: 'dialog',
          path: ':todoId',
          component: () => import('./TodoDetail.vue'),
          dialogOptions: { title: 'Todo Details', size: 'l' },
        },
      ] satisfies RoutedOverlayFragment[],
    },
  },
];
```

### Step 2: Wire Up the List View

```vue
<!-- TodoList.vue -->
<script setup lang="ts">
import { useFragmentNavigation, useRoutedModals } from '@cocoar/vue-fragment-parser';

// Auto-open/close modals based on URL fragments
useRoutedModals();

// Navigate to modal on interaction
const { navigateToModal } = useFragmentNavigation();

builder.onRowDoubleClicked((event) => {
  navigateToModal(event.data.id);
});

// With query params:
// navigateToModal(event.data.id, { tab: 0 })
// → URL: #todo-42?tab=0
</script>
```

### Step 3: Build the Modal Content

The modal component receives fragment params as props, plus a `close` function:

```vue
<!-- TodoDetail.vue -->
<script setup lang="ts">
const props = defineProps<{
  todoId: string;       // from fragment path ':todoId'
  tab?: number;         // from query params '?tab=2'
  close: (result?: unknown) => void;
}>();
</script>

<template>
  <div>
    <h3>Todo: {{ todoId }}</h3>
    <button @click="close()">Done</button>
  </div>
</template>
```

### Deep-Linking

Copy the URL `https://app.com/todos#todo-42?tab=2` and paste it in a new browser tab. The page loads, the fragment is parsed, and the modal opens automatically with `todoId: 'todo-42'` and `tab: 2`.

### Browser Back & History

The modal system integrates with browser history:

- **Modal open** → creates a history entry (`/todos` → `/todos#todo-42`)
- **Modal close** (X button) → creates another entry (`/todos#todo-42` → `/todos`)
- **Browser Back** after close → goes back to `/todos#todo-42` → modal reopens
- **Browser Back** while modal is open → goes back to `/todos` → modal closes

This means users can navigate modal state with the browser's back/forward buttons, just like regular pages.

### Multiple Modals

By default, `navigateToModal` **replaces** the current fragment. Use `append: true` to open multiple modals at once:

```ts
// Opens modal, replaces any existing fragment
navigateToModal('todo-42');
// URL: /todos#todo-42

// Opens second modal alongside the first
navigateToModal('confirm', undefined, { append: true });
// URL: /todos#todo-42#confirm
```

Each fragment is matched independently. Closing one modal removes only its fragment.

## Composable API

### `useFragmentNavigation()`

```ts
const { navigateToModal, closeModal } = useFragmentNavigation();
```

| Method | Parameters | Description |
|--------|-----------|-------------|
| `navigateToModal(path, params?, options?)` | `string, Record<string, ...>?, { append?: boolean }?` | Set fragment in URL, opens modal. `append: true` for multi-modal. |
| `closeModal(path)` | `string` | Remove fragment from URL, closes modal |

### `useRoutedFragments(routes?)`

```ts
const { fragments } = useRoutedFragments();
```

Reactively parses `route.hash` against routes from `route.meta.routedFragments`. Returns `computed<ParsedRoute[]>`.

### `useRoutedModals()`

```ts
useRoutedModals();
```

Fire-and-forget composable. Watches fragments and manages the overlay lifecycle:

- **`type: 'dialog'`** → opens via `useDialog().open()` with `DialogConfig` (shell with header/title)
- **`type: 'modal'`** → opens via `getOverlayService().open()` with `OverlaySpec` (raw overlay, no shell)

Handles:
- Fragment appears → lazy-load component → open dialog/modal
- Fragment removed (close button, browser back) → close
- Closed by user → remove fragment from URL
- Page load with fragment → deep-link: opens immediately

## API

### `parseFragment<T>(fragment, routes)`

| Parameter | Type | Description |
|-----------|------|-------------|
| `fragment` | `string` | URL fragment string (with or without leading `#`) |
| `routes` | `T[]` | Array of route definitions |

**Returns:** `ParsedRoute<T>[]` — array of matched routes

### Types

```ts
interface RoutedFragmentBase<TOptions = unknown> {
  type: string;
  path: string | string[];
  options?: TOptions;
}

interface ParsedRoute<T extends RoutedFragmentBase> {
  params: Record<string, unknown>;  // Path + query parameters
  route: T;                          // Matched route config
  fragment: string;                  // Original fragment string
}
```
