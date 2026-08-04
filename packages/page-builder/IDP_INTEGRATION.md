# IDP integration guide

This guide is the integration contract for the Page Builder prerelease. It separates
tenant-owned data from application-owned authority so an IDP can offer visual
customization without turning a page document into application code.

## 1. Install a prerelease

Use the `alpha` channel for feature-branch integration tests without merging the
implementation into `develop`. Alpha packages are hosted by GitHub Packages
under the physical `@cocoar-dev` scope. Configure the registry and a GitHub token
with `read:packages` in the consuming project:

```ini
# .npmrc
@cocoar-dev:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_PACKAGES_TOKEN}
```

Install them through pnpm aliases so application imports keep the stable
`@cocoar/*` names:

```bash
pnpm add --save-exact \
  "@cocoar/vue-page-builder@npm:@cocoar-dev/vue-page-builder@alpha" \
  "@cocoar/vue-ui@npm:@cocoar-dev/vue-ui@alpha" \
  "@cocoar/vue-localization@npm:@cocoar-dev/vue-localization@alpha" \
  "@cocoar/vue-script-editor@npm:@cocoar-dev/vue-script-editor@alpha" \
  monaco-editor
```

The Cocoar peer packages are published together at the same prerelease version.
Installing them from one channel prevents a feature-branch package from being
combined accidentally with an older beta runtime. The dependency keys and all
source imports remain `@cocoar/*`; only the package source in `package.json`
points at the temporary GitHub package.

The shared `develop` prerelease remains available on the `beta` channel:

```bash
pnpm add @cocoar/vue-page-builder@beta
```

Import `@cocoar/vue-page-builder/styles` once in the authoring application and
the application that renders the authentication views.

## 2. Persist one versioned document per scope and slot

The recommended storage key is:

```text
tenant / application-or-realm / slot / revision
```

The first preset release contains these slots:

- `login`
- `password-forgot`
- `logout`
- `consent`

Use `createAuthPageDocument(slot)` for the initial multilingual document and
`createAuthPageConfig(slot, locale)` as the common builder/renderer contract.
Persist the complete `PageNode` JSON, including its `schemaVersion`. Treat saved
documents as immutable revisions. Draft, published revision, rollback target,
ETag and audit metadata belong to the IDP record around that JSON rather than to
the generic page schema.

Recommended lifecycle:

```text
default -> draft -> server validation -> preview -> publish -> rollback/reset
```

Never overwrite the last published revision while saving a draft. Use an ETag or
revision number to reject concurrent saves.

## 3. Validate on both boundaries

Normalize and validate when loading an old document in the authoring UI:

```ts
const normalized = normalizePageSchema(storedDocument, config);
const validation = validatePageDocument(normalized.schema, config);
```

Repeat equivalent validation in the trusted publish endpoint. Client validation
is authoring feedback, not authorization. Reject unsupported schema versions,
disallowed element types, missing required nodes, document-limit violations and
invalid host-context bindings before a revision becomes active.

Authentication, consent, ticket ownership, redirect validation and field-level
authorization always remain authoritative on the server.

## 4. Define the application host once

`definePageRuntimeHost()` creates an application-owned capability catalogue and
grant policy. It does not create page state or a Worker by itself. Reuse this
object for renderer sessions throughout the application.

```ts
export const idpPageRuntimeHost = definePageRuntimeHost({
  endowments: {
    api: {
      call: withRuntimeEndowmentContext(
        ({ signal, tenantId, pageId }, operation, payload) =>
          idpPageApi.call({
            signal,
            tenantId,
            pageId,
            operation: String(operation),
            payload,
          }),
      ),
    },
  },
  grants: ({ pageId, definition }) => {
    if (!pageId.startsWith('auth:')) return [];
    if (!definition.id.startsWith('element-action:')) return [];
    return ['api'];
  },
});
```

Objects not listed in `endowments` cannot be granted. Objects listed but not
returned by `grants` are not described to that Worker session. Pure compute
bindings can never receive endowments. Keep the facade narrow: expose named IDP
operations, not a general-purpose URL fetcher.

## 5. Create one runtime session per rendered page

```ts
const {
  pageCodeValues,
  onRuntimeChange,
  runPageAction,
} = usePageCodeRuntime({
  pageId: computed(() => `auth:${slot.value}`),
  tenantId,
  schema,
  context,
  viewport,
  runtimeHost: idpPageRuntimeHost,
});
```

```vue
<CoarPageRenderer
  :schema="schema"
  :config="config"
  :runtime-context="context"
  :viewport-width="viewport.width"
  :page-code-values="pageCodeValues"
  :actions="hostActions"
  :on-action="runPageAction"
  @runtime-change="onRuntimeChange"
/>
```

The explicit `actions` map wins for host actions. The dynamic `onAction`
dispatcher handles internal Page-Code action ids through `runPageAction`. The
Auth Customization Lab is the executable reference wiring. Each composable
instance creates an isolated SES Worker session. Pages never share script
globals or Page State. Unmounting the owning Vue component disposes the session.

## 6. Keep navigation and authentication as host actions

Page documents may configure presentation, validation, element actions and
Page State. They do not create or delete elements at runtime, change an element
type/name, navigate directly, read cookies, access the DOM or call ambient
browser APIs.

Map stable action ids to trusted application handlers for operations such as:

- login submission;
- forgot-password submission;
- consent allow/deny;
- navigation back to login;
- external provider selection.

On errors, keep the renderer mounted and pass field/form errors back to its
feedback model. Do not discard entered values on HTTP 500, timeout or disconnect.

## 7. Localization

The page root owns tenant translations. Elements reference keys through
translation bindings; the Builder's Translations tab edits the catalogue.
Runtime lookup order is page translation, host localization store, binding
fallback, then key. Keep security- or protocol-owned messages in the host
catalogue when tenants must not replace them.

## 8. Deployment and beta boundary

Vite does not relocate `import.meta.url` assets while dependency pre-bundling.
The PageBuilder therefore publishes the Worker runtime as the isolated
`runtime-worker` subpath. Keep only this small entry out of the optimizer; the
PageBuilder, UI, Script Editor and their transitive dependencies remain fully
optimized:

```ts
// vite.config.ts
export default defineConfig({
  optimizeDeps: {
    exclude: ['@cocoar/vue-page-builder/runtime-worker'],
  },
});
```

Do not exclude the complete `@cocoar/vue-page-builder` package. That would also
skip optimization of CommonJS dependencies used by its UI/editor peers. The
consuming production build emits `pageScriptRuntime.worker-<hash>.js` under its
own configured `base`.

Serve that file as a same-origin module Worker and permit it through
`worker-src 'self'` (Modgud may keep `blob:` for unrelated Workers). SES uses
`Compartment.evaluate()` inside the Worker, so the Worker response must not
inherit an application CSP that forbids dynamic evaluation. Apply the strict
`script-src 'self'` policy to the HTML response, not indiscriminately to every
static asset. If the server requires a CSP header on the Worker response, scope
`script-src 'self' 'unsafe-eval'` to that response only. Do **not** add
`unsafe-eval` to the IDP document/application CSP.

The prerelease workflow verifies this from packed tarballs on Linux and Windows
with `vite --force`, a production build, a non-root `/idp/` base and a browser
boot under the strict document CSP.

Before general tenant production rollout, complete the product threat model,
independent security review, browser/mobile matrix, operational quotas and
server-side publication checks. The beta is intended for Modgud integration and
controlled testing, not an unreviewed public tenant rollout.
