---
description: "The useTimezone() composable exposes the detected IANA timezone as a reactive ref, with support for custom timezone providers."
---

<script setup>
import TimezoneDemo from './demos/TimezoneDemo.vue';
</script>

# Timezones

The `useTimezone()` composable provides the browser's detected IANA timezone identifier as a reactive ref. The date/time picker components in `@cocoar/vue-ui` use this automatically.

<TimezoneDemo />

## Usage

```vue
<script setup lang="ts">
import { useTimezone } from '@cocoar/vue-localization';

const { timezone, refresh } = useTimezone();

// timezone.value → "Europe/Berlin", "America/New_York", etc.
</script>

<template>
  <p>Your timezone: {{ timezone }}</p>
  <button @click="refresh()">Re-detect</button>
</template>
```

## Custom Timezone Providers

You can supply custom providers (e.g. from a user profile API) that are checked before the browser default.

```ts
import { createCoarLocalization } from '@cocoar/vue-localization';
import type { CoarTimezoneProvider } from '@cocoar/vue-localization';

const userTimezone: CoarTimezoneProvider = {
  getTimezone() {
    // Return from user settings, or null to defer to next provider
    return userStore.timezone ?? null;
  },
};

app.use(createCoarLocalization({
  timezoneProviders: [userTimezone],
}));
```

## `useTimezone()` API

| Property | Type | Description |
|----------|------|-------------|
| `timezone` | `Ref<string>` | Current IANA timezone identifier (reactive) |
| `refresh()` | `() => void` | Re-resolve timezone from providers |
