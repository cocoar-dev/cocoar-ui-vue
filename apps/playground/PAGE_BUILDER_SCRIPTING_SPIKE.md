# PageBuilder Browser Scripting Spike

Status: **Executable package integration reference — not a production security claim**
Date: 2026-08-03
Route: `/page-builder-scripting-spike`

## Question

Can the PageBuilder offer familiar JavaScript/TypeScript authoring instead of
adding inspector controls for every future behavior, while keeping the initial
IDP view fast and denying tenant scripts ambient browser authority?

## Implemented proof

The spike runs entirely in the browser with two explicit lifetimes:

```text
Application lifetime
└── PageRuntimeHost (no Worker)
    ├── shared host objects / third-party SDKs
    └── host-owned grant policy
        │ createSession(page, tenant, definitions)
        ▼
Renderer lifetime
└── PageRuntimeSession
    ├── page state, resources and dependency graph
    └── one ES-module Web Worker
        └── SES Compartment
            └── tenant binding/resource/action functions
```

- The real login `PageNode` renders independently of the worker.
- Script-dependent buttons start fail-closed (`disabled`).
- Three independent bindings derive button and select properties.
- Property reads are tracked at runtime and indexed by path. A username patch
  therefore does not re-evaluate the select-options binding.
- A generic async resource selects tracked inputs, debounces changes and uses
  real `await api.call("catalog.regions", input)` to load and transform options.
- Resource state is exposed as `resources[id].status/value/error/runId`; normal
  synchronous bindings consume it.
- The real `CoarPageRenderer` select remains disabled while the resource is
  pending and receives its options after success.
- An async action calls `api.call("auth.login", payload)`.
- The host constructs the endowment objects, including their data and method
  implementations. They are not fixed runtime vocabulary.
- Plain-object methods and class prototype methods are discovered automatically;
  class methods execute in the main thread with their original `this` object.
- Third-party instances and dependencies remain in the application bundle. Only
  the automatically generated facade shape and data-only calls cross the Worker.
- A context-aware wrapper is opt-in only for methods needing the host-owned
  session/page/tenant identity or an `AbortSignal`; normal methods need no adapter.
- Endowment grants are host-owned runtime configuration, separate from the
  tenant document. A script without a grant receives no endowments argument.
- Grants are per definition and object name. The host method receives the caller
  definition ID and owns any finer operation-level routing policy.
- Because functions cannot cross `postMessage`, the worker materializes a
  hardened RPC facade with the host-defined shape. This is the Worker equivalent
  of directly injecting a host object into an in-process interpreter such as Jint.
- Superseded resources abort their in-flight host call and late results are
  rejected by a monotonically increasing run ID (latest result wins).
- The host owns every capability implementation and endpoint decision. The same
  bridge can wrap fetch, IndexedDB, cache access or another approved source.
- Inputs, endowment arguments and results cross a bounded data-only validator.
- A main-thread timeout terminates the whole worker, covering infinite loops.
- Script output cannot contain functions, cycles, exotic prototypes, forbidden
  prototype keys, non-finite numbers or unbounded object graphs.

## Observed confinement

The executing guest diagnostic reports:

```text
typeof window                              "undefined"
typeof fetch                               "undefined"
typeof postMessage                         "undefined"
typeof endowments (script without grant)   "undefined"
typeof endowments?.api                     "undefined"
Object.isFrozen(globalThis)                true
Function("return typeof fetch")()          "undefined"
```

The worker itself has browser APIs. The SES Compartment does not receive them.

## Preliminary performance

Local production Vite preview, Chromium, desktop development machine:

```text
initial form render                        12.6–24.1 ms
worker + SES + three compiled scripts      40.9–54.5 ms (first spike revision)
latest production worker asset             92,860 bytes minified, before HTTP compression
```

The form was already rendered and the submit action remained safely disabled
while the worker initialized. These numbers are evidence of feasibility, not a
cross-device budget. Low-end mobile hardware, cold HTTP cache, browser variants
and the final runtime API still require measurement.

The package preserves a Vite `?worker&url` import in its built entry. The
consuming application therefore emits the runtime Worker under its own asset
base, and `PageScriptRuntime` starts that URL explicitly as an ES module. A
classic production Worker is sloppy-mode code, which SES correctly refuses to
initialize. A network Worker also keeps SES evaluation out of the document's
strict `script-src` CSP; the Worker response must not inherit that restriction.

## Authoring versus runtime

The IDP runtime must not load Monaco or the TypeScript compiler. The intended
pipeline is:

```text
Builder: TypeScript source + Monaco diagnostics
  → browser-side transpile/validation when applying or publishing
  → versioned JavaScript artifact

IDP view: artifact
  → SES compile once
  → reuse functions for bindings and actions
```

The spike currently embeds JavaScript-compatible TypeScript source to isolate
the runtime question. Transpilation, source maps and artifact versioning are a
separate authoring milestone.

## Host and session ownership

`definePageRuntimeHost(...)` is application-wide. It stores the real object
references and policy, but creates no Worker:

```ts
const runtimeHost = definePageRuntimeHost({
  endowments: {
    api: {
      kind: 'host-rpc-v1',
      call: withRuntimeEndowmentContext(async (context, operation, payload) => {
        // Trusted host routing. context includes session/page/tenant and signal.
      }),
    },
    labelFormatter: new ThirdPartyLabelFormatter(),
  },
  grants: ({ pageId, tenantId, definition }) => {
    if (pageId !== 'login' || tenantId !== 'tenant-a') return []
    if (definition.id === 'region-options') return ['api', 'labelFormatter']
    if (definition.id === 'login.submit') return ['api']
    return []
  },
})
```

Every mounted renderer/page execution owns a session and Worker:

```ts
const session = runtimeHost.createSession({
  pageId: 'login',
  tenantId: 'tenant-a',
  definitions,
})

await session.initialize()
await session.setState(initialState)

// Renderer unmount / page replacement:
session.dispose()
```

Disposal terminates the Worker, aborts in-flight host calls, clears resources
and removes the session from the host. A remount creates a different session ID
and Worker. The browser test verifies that the application host remains shared
while the active session count returns to one after unmount/remount.

The Worker receives only the union of endowments granted to definitions in that
session. Application-catalog objects that are not granted are not even described
across the Worker boundary. Bindings cannot receive endowments.

## Still required before production

1. Define the complete typed `PageRuntime` endowment contract and generate its
   Monaco `.d.ts` surface from the application TypeScript declarations.
2. Add script/artifact versions, content hashes, compilation diagnostics and
   source maps.
3. Define binding targets through generic element-registry metadata.
4. Stress-test path tracking, cascading resources and batching with 50–100
   bindings, dynamic branches and large option sets.
5. Specify execution, payload, memory and endowment-call quotas.
6. Threat-model and independently review the complete host-capability boundary.
7. Test Chromium, Firefox and WebKit plus representative low-end mobile devices.
8. Define CSP, worker loading and deployment requirements.
9. Keep server-side validation and authorization authoritative.

## Verification

```powershell
pnpm --filter @cocoar/playground build
pnpm --filter @cocoar/playground exec playwright test e2e/page-builder-scripting.spec.ts
pnpm --filter @cocoar/vue-page-builder test
```

The E2E tests check fail-closed initial rendering, SES globals, absence of
ungranted endowments, path-specific binding evaluation, an awaited async select
resource, superseding/cancelling a slow resource, rejected actions and a
successful host-endowment call. They also verify renderer unmount/remount session
disposal and the automatically reflected class-instance endowment used by the
resource.

## Reactive and async contract proven by the spike

Definitions are deliberately generic:

```ts
type RuntimeDefinition =
  | { id: string; kind?: 'script'; source: string }
  | { id: string; kind: 'binding'; source: string }
  | {
      id: string
      kind: 'resource'
      inputsSource: string
      source: string
      debounceMs?: number
      timeoutMs?: number
    }
```

The application host and the renderer session initialize code and authority
separately:

```ts
const runtimeHost = definePageRuntimeHost({
  endowments: { api, storage, thirdPartySdk },
  grants: hostGrantPolicy,
})

const runtime = runtimeHost.createSession({
  pageId: 'login',
  tenantId: 'tenant-a',
  definitions,
})

await runtime.initialize()
```

`inputsSource` is synchronous and dependency-tracked. `source` may be async:

```ts
const inputsSource = `(scope) => ({ locale: scope.context.locale })`

const source = `async (input, { api }) => {
  const result = await api.call("catalog.regions", input)
  return result.map(item => ({ value: item.id, label: item.label }))
}`
```

The main thread sends granular changes after initial state setup:

```ts
runtime.patchState([{
  op: 'set',
  path: ['fields', 'username'],
  value: 'alice',
}])
```

The worker evaluates only definitions whose recorded dependency paths intersect
the changed path. Dependencies are re-recorded on every evaluation, so branches
and computed access can change the dependency set over time.
