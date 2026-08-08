---
description: "Integrate Page Builder 2.19 into an identity provider with isolated SES Worker sessions, host-owned capabilities, versioned documents and server-authoritative publication."
---

# IDP integration

Page Builder 2.19 ships the complete browser runtime and four optional Auth
example presets. They are fixtures built from the same generic registry,
Repeat, selection, action and styling contracts as every consumer page; the
runtime contains no Modgud/auth-specific element types or branches.

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

Resolve the application/client theme in the host, then use the generic UI
scope for runtime and the Builder's preview-only prop for authoring:

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

The Builder applies `previewTheme` only around its embedded renderer; toolbar,
properties, dialogs and Monaco retain the administration application's theme.
Register host CSS via `config.stylePresets` and load the corresponding scoped
classes in both administration and runtime. The document persists only the
preset id.

## Monaco workers in the authoring application

The Builder uses Monaco in JavaScript and JSON mode. A Vite consumer must route
both languages to their matching workers before the first Builder mounts:

```ts
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

Routing `json` to the generic editor worker causes diagnostics such as
`Missing requestHandler or method: doValidation`, `findDocumentColors` or
`getFoldingRanges`. This is a consumer worker configuration error, not a
PageBuilder runtime or sandbox failure.

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

The complete storage lifecycle, Vue wiring, capability example and production security
boundary are included in the package's `IDP_INTEGRATION.md`.
