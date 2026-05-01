# `@cocoar/vue-calendar`

Production-grade calendar component for Vue 3 — month / week / day / agenda
views, recurrence (RFC 5545), drag-and-drop, virtualization for 10k+ events.
Built natively against the Cocoar Design System.

## Status

**Phase 0 — Prototyping.** The package is an empty skeleton; spikes are
landing under [`apps/docs/calendar-spike/`](../../apps/docs/calendar-spike/)
to validate the architecture before Phase 1 implementation begins.

See the design document at `.local/cocoar-vue-calendar-v0.2.md` and the
spike plan at `.local/cocoar-vue-calendar-phase0-spike-plan.md`.

## Layout

```
packages/calendar/
  src/
    core/          ← pure TypeScript, no Vue. Lint-enforced one-way imports.
    components/    ← Vue 3 components (Phase 1+)
    composables/   ← Vue composables (Phase 1+)
    index.ts       ← public barrel
```

## Public API

Empty in Phase 0. Phase 1 adds:

```ts
import { CoarCalendar } from '@cocoar/vue-calendar';

// or, for advanced consumers needing the framework-agnostic core:
import { EventIndex, expandRecurrence } from '@cocoar/vue-calendar/core';
```
