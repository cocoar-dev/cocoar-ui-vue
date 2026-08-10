# IDP integration guide

This guide is the integration contract for Page Builder 2.20. It separates
tenant-owned data from application-owned authority so an IDP can offer visual
customization without turning a page document into application code.

## 1. Install the matching package set

Install the Page Builder and its Cocoar peers at the same release version. Pinning
the set prevents an authoring package from being combined accidentally with an
older renderer, localization or ScriptEditor runtime:

```bash
pnpm add --save-exact \
  @cocoar/vue-page-builder@2.20.0 \
  @cocoar/vue-ui@2.20.0 \
  @cocoar/vue-localization@2.20.0 \
  @cocoar/vue-script-editor@2.20.0 \
  monaco-editor@^0.55.1
```

### Prerelease channels

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

The dependency keys and all source imports remain `@cocoar/*`; only the package
source in `package.json` points at the temporary GitHub package.

The shared `develop` prerelease remains available on the `beta` channel:

```bash
pnpm add @cocoar/vue-page-builder@beta
```

Import `@cocoar/vue-page-builder/styles` once in the authoring application and
the application that renders the authentication views.

### Register all Monaco workers used by the Builder

The Page Builder opens Monaco in JavaScript **and JSON** mode. The consuming
authoring application therefore has to route both language labels to their
matching Monaco workers before the first Builder mounts:

```ts
// src/main.ts (Vite)
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';

self.MonacoEnvironment = {
  getWorker(_workerId, label) {
    if (label === 'typescript' || label === 'javascript') return new TsWorker();
    if (label === 'json') return new JsonWorker();
    return new EditorWorker();
  },
};
```

Do not route `json` to the generic `EditorWorker`. The JSON language client then
requests methods that worker cannot provide and logs errors such as
`Missing requestHandler or method: doValidation`, `findDocumentColors`, or
`getFoldingRanges`. Script execution is unaffected, but JSON validation,
folding and color support are unavailable until the correct worker is used.

### Theme and host style registration

Resolve the application/client theme in the IDP and pass stable primitives to
the generic UI scope. Runtime and Builder preview intentionally share this one
implementation:

```vue
<CoarThemeScope :theme="applicationTheme" mode="auto">
  <CoarPageRenderer :schema :config />
</CoarThemeScope>

<CoarPageBuilder
  v-model="schema"
  :config="config"
  :preview-theme="applicationTheme"
  preview-theme-mode="dark"
/>
```

`previewTheme` is scoped to the embedded renderer; the Builder toolbar,
Properties panel, dialogs, and Monaco keep the administration theme.

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

The host owns the starting document and the `PageConfig` for each slot; the
package ships neither. Persist the complete `PageNode` JSON, including its `schemaVersion`. Treat saved
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
disallowed element types, document-limit violations and invalid host-context
bindings before a revision becomes active. Anything the tenant must not remove
— a compliance notice on a consent screen — is checked here too: the library
has no mechanism that could hold it in the browser.

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

## 8. Deployment and production boundary

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
`worker-src 'self'` (the application may keep `blob:` for unrelated Workers). SES uses
`Compartment.evaluate()` inside the Worker, so the Worker response must not
inherit an application CSP that forbids dynamic evaluation. Apply the strict
`script-src 'self'` policy to the HTML response, not indiscriminately to every
static asset. If the server requires a CSP header on the Worker response, scope
`script-src 'self' 'unsafe-eval'` to that response only. Do **not** add
`unsafe-eval` to the IDP document/application CSP.

The packed-consumer CI and release gates verify this from tarballs on Linux and
Windows with `vite --force`, a production build, a neutral non-root
`/consumer-app/` base and a browser boot under the strict document CSP.

### Decorative visual documents

Use the built-in `visual-markup` element only for non-semantic decoration.
`PageConfig.visualMarkup` is the host-controlled capability boundary for
approved font data/blob URLs and sanitized CSS custom properties. The page
author controls the node's allowlisted HTML, inline SVG and local CSS, while
the renderer supplies an empty iframe sandbox and a restrictive document CSP.
No JavaScript, form control, navigation or network API is available.

Pass the same `PageConfig` to the Builder and Runtime. The Builder's Preview tab
uses the real renderer; it intentionally does not grant a more permissive
preview environment. Size the opaque iframe through the outer node style—it
cannot inspect its content to auto-report height. Invalid or oversized visual
content is a node-local error: the iframe stays absent while the remaining IDP
form renders normally. The host's whole-document fallback is reserved for an
invalid or failed published page, not a rejected decorative node.

Before general tenant production rollout, complete the product threat model,
independent security review, browser/mobile matrix, operational quotas and
server-side publication checks. A stable library version supplies the technical
boundary; it does not replace the consuming SaaS product's own security and
publication review.

### Reusable composition repository

Reusable subtrees belong to the authoring workflow, not to the IDP request
runtime. Supply a host-owned `PageCompositionRepository` to `CoarPageBuilder`.
The Builder stores exact immutable version tokens, materializes the complete
subtree in the draft, and preserves instance ids/names while applying an update.
The host repository should enforce tenant ownership and optimistic concurrency
through `baseVersion` on `publish`.

For a SaaS authoring host, expose definitions separately from pages:

- **Pages** embed the Builder with `composition-management="consume"` and may
  drag definitions from the **Compositions** palette group, select another
  immutable version, update to latest or detach pinned instances.
- **Compositions** edit one standalone definition tree and call repository
  `create()` / `publish()` at the host boundary.

Use `@open-composition="openComposition"` on `CoarPageBuilder` to connect the
Properties action to that separate host area. The event carries the exact
pinned `{ id, version }`; the host should open that version rather than latest.
The palette drag payload is editor-only. A successful drop is persisted solely
as the already-defined materialized nodes plus `composition` and
`compositionOrigins`; no wrapper or composition element type is introduced.

Removing a composition instance from Login therefore changes only Login. It
does not mutate the definition, Logout, or any other consumer. Publishing a new
definition version also leaves every page pinned until its author updates it.

At the server-side publication boundary:

1. Load the tenant-owned authoring document.
2. Run `validatePageCompositionReferences(document, repository)` and reject
   missing versions or cycles.
3. Run the normal page-document validation and security checks.
4. Store `compilePageCompositions(document)` as the immutable runtime document.

The runtime document contains no composition reference and never loads a
repository. A missing repository therefore affects authoring/update only, not a
previously materialized draft or an already published IDP page.
