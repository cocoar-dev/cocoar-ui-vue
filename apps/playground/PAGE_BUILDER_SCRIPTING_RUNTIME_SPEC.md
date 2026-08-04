# PageBuilder Scripting Runtime Architecture

The visual JavaScript authoring model, Page State plus per-element code wire
format, and Monaco integration are documented in
[`PAGE_BUILDER_SCRIPTING_AUTHORING.md`](./PAGE_BUILDER_SCRIPTING_AUTHORING.md).

Status: **Exported beta package API and schema v4; controlled integration testing, not a production security claim**
Date: 2026-08-03
Executable route: `/page-builder-scripting-spike`

## 1. Purpose

This document defines the current browser runtime direction for tenant-authored
PageBuilder scripts. It replaces the expression-only runtime direction in
`PAGE_BUILDER_SCRIPTING_SPEC.md`; authoring, TypeScript compilation and Monaco
integration remain separate work.

The runtime must provide:

- familiar JavaScript/TypeScript-compatible syntax;
- synchronous reactive bindings;
- awaited actions and async resources;
- host-defined objects without ambient browser authority;
- per-renderer isolation and hard termination;
- generic behavior rather than authentication-specific components or APIs.

## 2. Lifetime and ownership

There are two distinct objects and lifetimes.

```text
Application
└── PageRuntimeHost                     one per application/security domain
    ├── endowment catalog
    └── grant policy
        │
        ├── PageRuntimeSession          one per mounted PageRenderer
        │   └── Worker + SES Compartment
        │
        └── PageRuntimeSession          another mounted PageRenderer
            └── Worker + SES Compartment
```

### 2.1 `PageRuntimeHost`

The host is created once by trusted application code. Creating it does not
create a Worker.

It owns:

- real application/third-party object references;
- the policy resolving which definition receives which object;
- the set of active renderer sessions;
- future generated TypeScript/Monaco declarations for those objects.

Real host objects may be shared by many sessions. Their execution state is not.

### 2.2 `PageRuntimeSession`

A session is created for one mounted renderer/page execution. It owns:

- one terminable ES-module Worker;
- one SES Compartment;
- compiled script functions;
- page state and resource state;
- the dependency graph;
- timers, outstanding calls and cancellation;
- the resolved subset of endowments for the page.

Unmounting or replacing the page MUST dispose the session. Disposal terminates
the Worker, aborts calls and releases handles. Sessions MUST NOT be shared by
different tenants or independent PageRenderer instances.

A state transition within one page document may reuse the session. A different
page document should create a new session.

## 3. Host API

```ts
const runtimeHost = definePageRuntimeHost({
  endowments: {
    api,
    storage,
    thirdPartySdk,
  },
  grants: ({ pageId, tenantId, definition }) => {
    // Trusted application policy; never tenant document authority.
    return definition.id === 'region-options' ? ['api'] : []
  },
})

const runtime = runtimeHost.createSession({
  pageId: 'login',
  tenantId: 'tenant-a',
  definitions,
})

await runtime.initialize()
await runtime.setState(initialState)

// Renderer unmount:
runtime.dispose()
```

`createSession` creates the Worker. `definePageRuntimeHost` does not.

## 4. Endowments

An endowment is a trusted host-owned object selectively made callable by guest
scripts. `api` is only an example name; the runtime has no built-in `api`,
`fetch`, `router`, `storage` or domain vocabulary.

### 4.1 Automatic surface discovery

The transport mapping is automatic:

- enumerable functions on plain objects become remote methods;
- data-only enumerable values on plain objects become hardened facade values;
- class prototype methods become remote methods;
- class instances remain in the main application;
- class methods execute with `this` bound to the original instance;
- accessors, constructors and class internal fields are not reflected;
- `__proto__`, `prototype` and `constructor` are forbidden members.

Third-party dependencies therefore remain in the application bundle. No manual
RPC handler is required per method.

### 4.2 Normal methods

Normal methods receive exactly the guest arguments:

```ts
class Formatter {
  decorateAll(labels: string[]) {
    return labels.map(label => label.trim())
  }
}

const host = definePageRuntimeHost({
  endowments: { formatter: new Formatter() },
})
```

Guest usage is Promise-based because the call crosses a Worker boundary:

```ts
const labels = await formatter.decorateAll(input.labels)
```

### 4.3 Context-aware methods

Only methods requiring trusted caller identity or cancellation use the opt-in
wrapper:

```ts
const api = {
  call: withRuntimeEndowmentContext(async (context, operation, payload) => {
    context.signal       // host AbortSignal
    context.sessionId    // host-generated
    context.pageId       // host-provided
    context.tenantId     // host-provided
    context.definitionId // executing definition
  }),
}
```

These context values are never guest arguments and cannot be forged by the
tenant script.

### 4.4 Transport boundary

Arguments and results are data-only. The runtime rejects:

- functions and symbols;
- cycles;
- exotic prototypes/class instances;
- forbidden prototype keys;
- non-finite numbers;
- values exceeding depth or node limits.

Non-serializable third-party instances remain host-side and require opaque
handles if later calls must refer to them.

## 5. Authority and grants

The application grant policy is the authority boundary. A page document MUST
NOT be able to persist or modify effective grants.

Grants apply per definition and endowment object:

```ts
{
  'region-options': ['api', 'formatter'],
  'login.submit': ['api', 'router'],
}
```

Rules:

- bindings cannot receive endowments;
- a session Worker receives only the union granted to its definitions;
- ungranted application-catalog objects are not described to the Worker;
- a definition with no grant receives no endowments argument;
- host methods MUST validate tenant-controlled arguments;
- operation-level authorization remains host-owned;
- backend authorization and validation remain authoritative.

## 6. Script definitions

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

Bindings are synchronous and pure. Actions/scripts and resource bodies may use
`await` only through granted endowments.

## 7. Reactive bindings

The initial state is sent once. Later changes are granular path patches:

```ts
runtime.patchState([{
  op: 'set',
  path: ['fields', 'username'],
  value: 'alice',
}])
```

During evaluation a read-only tracking proxy records accessed paths. The Worker
maintains a reverse dependency index and reevaluates only intersecting
definitions. Dependencies are replaced after every execution so conditional and
computed access may change them dynamically.

## 8. Async resources

Resource input selection is synchronous and dependency-tracked. The run body may
await host methods:

```ts
const inputsSource = `(scope) => ({ locale: scope.context.locale })`

const source = `async (input, { api }) => {
  return await api.call("catalog.regions", input)
}`
```

Resource state is available to bindings:

```ts
resources[id].status // idle | pending | success | error
resources[id].value
resources[id].error
resources[id].runId
```

Resources implement debounce, host-call cancellation, monotonically increasing
run IDs, late-result rejection and timeouts. `await` does not require another
Worker per resource; one page Worker schedules all of them.

## 9. Failure and lifecycle behavior

- Script-dependent interactions start fail-closed before runtime readiness.
- Initial page layout does not wait for Worker/SES initialization.
- A synchronous execution timeout terminates the session Worker.
- A resource timeout terminates the session Worker.
- Superseded resource calls receive an aborted host `AbortSignal`.
- Disposed sessions reject later invocation/state operations.
- One failed session MUST NOT terminate another renderer session.

## 10. Current implementation boundary

The executable runtime now ships from `@cocoar/vue-page-builder`: Worker,
protocol, `PageScriptRuntime`, `PageRuntimeHost` and `usePageCodeRuntime`. The
Playground consumes only those public exports and remains the executable
reference application.

Before general production rollout:

1. generate Monaco `.d.ts` declarations and an async remote type surface from
   host TypeScript declarations;
2. define artifact/version/source-map formats;
3. add 50–100 binding/resource stress benchmarks;
4. complete a security review and cross-browser test matrix;
5. lock the long-term artifact/source-map format beyond the beta contract;
6. complete operational quotas and handle registries.

## 11. Verified behavior

The browser suite verifies:

- fail-closed rendering before SES readiness;
- absence of `window`, `fetch`, `postMessage` and ungranted endowments;
- awaited select-option loading;
- path-specific binding invalidation;
- debounce/cancellation/latest-result-wins;
- automatic class prototype method reflection and `this` binding;
- host action success/failure;
- renderer unmount disposal and a fresh session on remount.
