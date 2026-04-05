# Fragment Parser

Parse URL fragments (hash portion) into structured routes with parameters. Useful for modal routing, deep-linking, and multi-step flows without page navigation.

::: info Separate Package
```bash
pnpm add @cocoar/vue-fragment-parser
```
:::

```ts
import { parseFragment } from '@cocoar/vue-fragment-parser';
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
