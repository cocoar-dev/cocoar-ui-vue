---
description: "Integrate the Page Builder beta into an identity provider with isolated SES Worker sessions, host-owned capabilities, versioned documents and server-authoritative publication."
---

# IDP integration

The Page Builder beta ships the complete browser runtime and four optional Auth
presets. Modgud can therefore consume package APIs instead of copying code from
the Playground.

## Public integration surface

```ts
import {
  createAuthPageConfig,
  createAuthPageDocument,
  definePageRuntimeHost,
  usePageCodeRuntime,
  validatePageDocument,
} from '@cocoar/vue-page-builder';
```

The initial preset slots are `login`, `password-forgot`, `logout` and `consent`.
They demonstrate generic elements, feedback zones, validation, responsive
overrides, repeaters, Page State, per-element code and key-based translations.
The presets are defaults, not special element types.

## Ownership boundary

| Concern | Owner |
|---|---|
| Structure, styles, translations, Page State and Element Code | Page document |
| Element/action/context allowlists | IDP `PageConfig` |
| API facades and grants | Application `PageRuntimeHost` |
| Login, consent, tickets, redirects and authorization | IDP backend |
| Drafts, revisions, publish, rollback and audit | IDP persistence layer |

Create one application-wide host. Each `usePageCodeRuntime()` instance creates
an isolated Worker session for one rendered page; sessions do not share globals
or Page State. A host object is available to tenant code only when it exists in
the host catalogue and the grant policy returns its name for that exact runtime
definition.

```ts
const runtimeHost = definePageRuntimeHost({
  endowments: { api: idpPageApiFacade },
  grants: ({ pageId, definition }) =>
    pageId.startsWith('auth:') && definition.id.startsWith('element-action:')
      ? ['api']
      : [],
});
```

Without a grant there is no `api`; there is never ambient `window`, `fetch`, DOM
or filesystem access in Element Code.

For Vite 8, keep only the Worker-bearing runtime subpath outside dependency
pre-bundling:

```ts
optimizeDeps: {
  exclude: ['@cocoar/vue-page-builder/runtime-worker'],
}
```

The main PageBuilder package and all UI/editor dependencies remain optimized.
The packed-consumer matrix verifies forced development optimization and the
production Worker asset on both Linux and Windows.

## Publication boundary

Save drafts as immutable, versioned documents and activate a revision only after
trusted server validation. The browser's `validatePageDocument()` provides the
same fast feedback to the author but cannot authorize publication. Keep a known
good default and published revision so invalid or unavailable customizations can
fall back without breaking authentication.

The complete storage lifecycle, Vue wiring, capability example and beta security
boundary are included in the package's `IDP_INTEGRATION.md`.
