# PageBuilder Expressions & Scripting Specification

Status: **Historical expression-only draft — not the current implementation direction**
Scope: `@cocoar/vue-page-builder`, `@cocoar/vue-script-editor`, Auth Customization Lab
Related: [`PAGE_BUILDER_AUTH_FEATURE_REQUEST.md`](./PAGE_BUILDER_AUTH_FEATURE_REQUEST.md)

Current runtime architecture:
[`PAGE_BUILDER_SCRIPTING_RUNTIME_SPEC.md`](./PAGE_BUILDER_SCRIPTING_RUNTIME_SPEC.md)

> **Direction update (2026-08-03):** The expression-AST design below predates the
> browser-only SES spike. The executable spike now includes path-based runtime
> dependency tracking, granular state patches, awaited async resources,
> cancellation/latest-result-wins and host-defined, per-script endowments.
> It intentionally tests general JavaScript syntax in a Web Worker with an SES
> Compartment and explicit host-defined endowments. See
> [`PAGE_BUILDER_SCRIPTING_SPIKE.md`](./PAGE_BUILDER_SCRIPTING_SPIKE.md). This
> document must be rewritten before scripting becomes a supported wire contract.

## 1. Purpose

The PageBuilder needs generic, reactive behavior without adding one schema property
and one inspector control for every future combination. Examples include:

- disable a submit button while the visible form is invalid;
- change a label while an action is pending;
- show content for a host-controlled state or capability;
- derive a generic element property from form values, host context or a repeater item;
- express the same behavior for authentication, onboarding, checkout and other domains.

Users should write familiar JavaScript/TypeScript-style expressions and receive
accurate IntelliSense. The runtime does not have to execute those expressions with a
general-purpose JavaScript engine.

This specification defines the required language surface, authoring experience,
runtime contract, security boundary, performance budget and failure behavior before
an engine or wire format is selected.

## 2. Normative language

`MUST`, `MUST NOT`, `SHOULD`, `SHOULD NOT` and `MAY` are normative requirements.

## 3. Goals

The first release MUST:

1. use familiar TypeScript-compatible expression syntax;
2. provide completion, hover information and diagnostics in `CoarScriptEditor`;
3. evaluate synchronously and fast enough for input-driven UI state;
4. remain deterministic and side-effect free;
5. expose only explicitly declared runtime data;
6. bind expressions generically to element properties supported by the registry;
7. validate both the expression and its result type;
8. behave identically in Builder Preview and `CoarPageRenderer`;
9. fail safely without unmounting the page or losing form values;
10. remain independent of authentication-specific concepts.

## 4. Non-goals for version 1

Version 1 MUST NOT provide:

- arbitrary JavaScript program execution;
- statements, loops, function declarations, classes or modules;
- DOM, browser, storage, cookie, network or timer access;
- direct invocation of host actions;
- mutation of fields, context, state, selection or component instances;
- dynamic imports or dependencies;
- tenant-defined helper functions;
- asynchronous expressions;
- expressions that create redirect URLs, asset URLs or action IDs;
- a replacement for server-side validation or authorization.

Full script bodies MAY be considered in a later specification. They are not implied
by adopting TypeScript expression syntax.

## 5. Terminology

- **Expression source**: text authored by a user, for example `!form.valid`.
- **Expression AST**: parsed and validated representation used by the safe runtime.
- **Scope**: the complete set of values visible to an expression.
- **Target**: an element property that receives the expression result.
- **Capability**: a registry-declared property that may be targeted dynamically.
- **Host context**: typed runtime data explicitly exposed through `PageConfig`.
- **Pure helper**: a built-in deterministic function without side effects.

## 6. Proposed authoring model

### 6.1 Editor component

Expression editing MUST use the existing `CoarScriptEditor` with:

- `language="typescript"`;
- `variant="inline"` for a property expression;
- a hidden `preamble` declaring the available root values;
- generated `extraLibs` for context, field, state and repeater item types;
- `scriptMode` only where required by the chosen wrapper;
- DOM and Web Worker libraries excluded from IntelliSense;
- runtime-specific globals absent unless this specification explicitly adds them.

The current ScriptEditor already supports TypeScript language services, hidden
preambles and additional declaration files. The implementation SHOULD extend those
existing contracts rather than register an unrelated Monaco language.

### 6.2 Required IntelliSense behavior

For every expression editor, Monaco MUST provide:

- completion for the available root identifiers;
- completion for allowed properties below each root;
- exact primitive, object, array and union types;
- literal completion for configured view-state IDs;
- repeater item completion based on that repeat source's item contract;
- hover documentation for roots, properties and helpers;
- signature help for allowed helpers;
- diagnostics for unknown names and type-incompatible operations;
- diagnostics for syntax supported by TypeScript but forbidden by this runtime;
- a diagnostic when the expression result cannot be assigned to the target property.

IntelliSense MUST NOT suggest APIs that the runtime cannot execute.

### 6.3 Basic and advanced authoring

The Builder SHOULD offer two views over the same expression:

1. **Rule UI** for common cases: target, source, operator and value.
2. **Expression UI** using `CoarScriptEditor` for advanced cases.

Both views MUST round-trip through one canonical expression/AST model. Switching
between them MUST NOT change semantics. Expressions that cannot be represented by the
Rule UI MAY remain expression-only.

## 7. Scope and type model

Version 1 SHOULD expose the following roots:

```ts
declare const form: Readonly<{
  valid: boolean
  invalid: boolean
  dirty: boolean
  submitting: boolean
  validating: boolean
}>

declare const fields: Readonly<PageFields>
declare const context: Readonly<PageRuntimeContext>
declare const state: PageViewState
declare const item: Readonly<RepeatItem> | undefined
declare const locale: string
```

### 7.1 `form`

`form` contains derived renderer state only. It MUST NOT expose passwords, tokens or
other field values. Field values are available through the separately typed `fields`
root when the host field contract permits them.

### 7.2 `fields`

`fields` is generated from `PageConfig.fields` and contains the current values of
named, allowed fields. Hidden-field semantics MUST match the renderer's action value
model. Sensitive fields MAY be marked `expressionReadable: false` and MUST then be
absent from both IntelliSense and runtime scope.

### 7.3 `context`

`context` is generated only from `PageConfig.contextFields`. Undeclared paths MUST be
absent rather than resolving through the original host object. The runtime MUST use a
bounded, data-only projection instead of exposing the host object by reference.

### 7.4 `state`

`state` is the page's own shared data, declared by the author with
`definePageState`. The host's "which screen is this" travels as ordinary
context — a `PageContextField` whose `allowedValues` list the screens — and is
read, never assigned, from an expression.

### 7.5 `item`

`item` exists only inside a repeater template. Its type and runtime projection are
generated from the repeat source's declared `itemFields`. Nested undeclared item
properties MUST be inaccessible.

### 7.6 `locale`

`locale` is read-only. Localized values remain the preferred mechanism for static
translations; expressions SHOULD only use locale when genuinely conditional content
is required.

## 8. Language surface

### 8.1 Syntax that version 1 MUST support

- literals: string, number, boolean, `null`, `undefined`;
- root identifiers and safe property reads;
- optional property reads where the selected parser supports them;
- array indexing with a bounded integer;
- unary `!`, unary `+` and unary `-`;
- `&&` and `||`;
- `===`, `!==`, `<`, `<=`, `>` and `>=`;
- numeric `+`, `-`, `*`, `/` and `%`;
- string concatenation with `+`;
- conditional `condition ? a : b`;
- array literals with bounded length;
- parentheses.

The implementation MAY add `??`, optional chaining and template literals in version
1 if the parser, Monaco diagnostics and runtime semantics match exactly.

### 8.2 Pure operations that version 1 SHOULD support

The initial allowlist SHOULD include:

- string/array `.length`;
- string/array `.includes(value)`;
- string `.startsWith(value)`;
- string `.endsWith(value)`;
- pure helpers `empty(value)` and `count(value)` if method syntax proves ambiguous.

Helpers MUST have fixed implementations, bounded input sizes and matching TypeScript
declarations. No method may be resolved dynamically from a runtime object.

### 8.3 Forbidden syntax

The parser/validator MUST reject:

- assignments and update operators;
- variable declarations;
- blocks and multiple statements;
- loops and recursion;
- function/arrow declarations;
- `new`, classes and prototypes;
- `this`, `super`, `globalThis` and implicit globals;
- `import`, `export`, `require`, dynamic import and modules;
- `async`, `await`, generators and promises;
- tagged templates;
- regular-expression literals unless separately specified and bounded;
- computed property names other than bounded numeric array indexes;
- access to `constructor`, `prototype` or `__proto__`;
- calls other than explicitly allowlisted pure helpers/methods;
- exception handling and explicit throws.

## 9. Generic binding model

Expressions MUST extend a generic property-binding model, not add behavior-specific
flags such as `disableWhenInvalid`.

Illustrative schema only; final wire format requires separate approval:

```json
{
  "id": "submit",
  "type": "button",
  "props": {
    "label": "Sign in",
    "action": "auth:login",
    "validates": true
  },
  "bindings": {
    "disabled": {
      "kind": "expression",
      "source": "!form.valid"
    }
  }
}
```

The element registry MUST declare which properties are bindable and their result
types. For example:

```ts
dynamicProps: {
  disabled: 'boolean',
  label: 'string',
  variant: ['primary', 'secondary', 'danger'],
}
```

The Builder MUST derive its target list and result diagnostics from this registry
metadata. It MUST NOT maintain a central list of every component property.

Host-level semantic targets such as `visible` MAY be defined once for all nodes.
Required/locked nodes MUST override an expression result that would violate their
security contract.

## 10. Actions and validation

Expressions MAY:

- compute whether an action element is disabled;
- compute JSON-safe additions to an action payload from already readable values;
- compute presentation state such as label, variant or visibility;
- participate in declarative client-side validation if the target/result contract is
  separately defined.

Expressions MUST NOT:

- invent or select an action ID not already allowed by the host;
- invoke an action directly;
- bypass `validates`, duplicate-submit protection or server validation;
- create a redirect or external URL;
- alter immutable repeater keys or required selection values;
- downgrade or hide a required security warning.

## 11. Runtime pipeline

The runtime MUST follow this conceptual pipeline:

```text
source → parse → syntax allowlist → type/target validation → immutable AST
      → dependency extraction → cached evaluator → result type validation
```

### 11.1 Compile time

- Parsing and structural validation SHOULD happen when applying JSON, saving and
  activating a document.
- The source MUST be parsed once per unique expression and cached.
- Dependencies such as `form.valid` and `fields.username` SHOULD be extracted from
  the validated AST.
- A document with invalid required expressions MUST NOT be activated.

### 11.2 Evaluation time

- Evaluation MUST be synchronous for render-state bindings.
- Only expressions whose dependencies changed SHOULD be reevaluated.
- There MUST be no polling or evaluation on every animation frame.
- Inputs MUST be read-only data projections.
- Outputs MUST be checked against the registry target type before use.
- Evaluation MUST NOT mutate the schema or form model.

### 11.3 Persistence

The decision whether to persist source only, source plus AST, or a versioned compiled
form remains open. Regardless of choice:

- source MUST remain available for authoring;
- compiled artifacts MUST carry an engine/version identifier;
- stale compiled artifacts MUST be discarded and rebuilt deterministically;
- runtime values and fixtures MUST never be persisted into the document.

## 12. Security boundary

The threat model assumes a tenant administrator may author malicious expressions and
an unauthenticated end user may cause hostile runtime values to be supplied.

The engine MUST:

- interpret a validated AST rather than use `eval`, `Function` or equivalent;
- use an explicit AST-node allowlist;
- use explicit operator/helper implementations;
- reject unknown identifiers and unknown properties;
- project scope data into bounded data-only structures;
- block prototype-related property names at every read;
- limit source length, AST node count, nesting depth and collection sizes;
- limit total evaluation work per update;
- return no functions, promises, proxies, DOM nodes or class instances;
- validate outputs before applying them;
- emit no secrets in errors, logs or diagnostics;
- preserve host ownership of actions, redirects and required security content.

A Worker or hardened JavaScript compartment MAY be used as defense in depth or for a
future full-script mode. It is not required for a bounded AST interpreter.

## 13. Performance requirements

Initial budgets, to be confirmed with a reproducible benchmark:

- maximum expression source: 4 KiB;
- maximum 200 AST nodes per expression;
- maximum nesting depth: 20;
- maximum 200 expressions per document;
- parse/validate an entire maximum-size document in under 50 ms at p95 on the agreed
  reference browser/device;
- reevaluate 100 affected simple expressions in under 5 ms at p95;
- reevaluate a typical form update in under 1 ms at p95;
- no visible typing latency attributable to expression evaluation;
- no Monaco or TypeScript runtime in the standalone renderer bundle;
- expression parsing/evaluation code SHOULD be lazy-loaded by the Builder and kept
  small in the Renderer.

Benchmarks MUST cover 320 px Auth Login, 50 consent items and rapid input events.

## 14. Failure behavior

### 14.1 Builder

- Syntax, unsupported constructs, unknown identifiers and type mismatches MUST show
  inline diagnostics.
- Invalid expressions MUST block activation/publishing, but SHOULD remain editable.
- The Preview MUST show the same fallback result as runtime.

### 14.2 Renderer

- A failed non-critical binding MUST use its declared/static fallback value.
- A failure MUST NOT unmount the page or clear form/repeater values.
- Identical runtime failures SHOULD log at most once per expression/document version.
- A failure affecting a required security invariant MUST invalidate the document and
  activate the host-owned fallback schema.

## 15. Compatibility and migration

- Existing direct bindings, localized values and `visibleWhen` documents MUST keep
  rendering unchanged.
- Expression support requires a documented schema-version decision.
- `visibleWhen` MAY later migrate to the unified expression target `visible`, but the
  first release SHOULD support both to reduce migration risk.
- No migration may convert a declarative condition into source text unless the result
  is deterministic and covered by snapshot tests.
- Unknown future expression kinds MUST fail closed for the affected target.

## 16. Required tests

### Language/runtime

- every supported AST node and operator;
- every forbidden construct;
- unknown root/property access;
- prototype escape attempts;
- complexity, depth and source-size limits;
- deterministic evaluation and result typing;
- dependency extraction and cache invalidation;
- hostile strings, arrays and nested objects;
- no mutation of input scope.

### IntelliSense

- completion for roots and typed properties;
- state literal completion;
- repeater item completion;
- sensitive/undeclared properties absent;
- hover/signature documentation;
- diagnostics for forbidden syntax and wrong result types;
- parity between generated declarations and runtime projections.

### PageBuilder/Renderer

- `disabled = !form.valid` for a generic form;
- text/variant binding from host context and state;
- repeater item expression;
- fallback on expression error;
- required-node invariant cannot be bypassed;
- Builder Preview equals standalone renderer;
- 100-expression and 50-item performance benchmark.

### Auth acceptance cases

- Login submit disabled until username and password are valid;
- Forgot Password submit disabled until identifier is valid;
- submitting label/disabled state updates without losing values;
- Consent required selection cannot be overridden;
- errors preserve inputs and selection;
- no Auth-specific identifiers exist in the expression engine.

## 17. Delivery gates

1. **Spec approval** — language, scope, target model and budgets agreed.
2. **Spike** — parser/evaluator plus benchmark; no schema integration.
3. **Editor spike** — `CoarScriptEditor` IntelliSense and custom diagnostics from a
   generated PageConfig contract.
4. **Security review** — AST allowlist, property access and invariant enforcement.
5. **Wire-format decision** — source/AST persistence and schema version.
6. **Generic integration** — registry-declared dynamic properties.
7. **Auth migration** — replace the temporary button behavior and then consider
   migrating `visibleWhen`.
8. **E2E and performance gate** — Lab parity plus agreed budgets.

No production schema change SHOULD be merged before gates 1–5 are complete.

## 18. Open decisions

The following require explicit agreement:

1. Is version 1 expression-only, or must it support multi-statement scripts?
2. Which parser produces the validated AST?
3. Is the persisted canonical form source, AST, or both?
4. Is compilation performed in the browser, on the server, or both?
5. Which exact pure helpers/methods are available?
6. Are field values readable by default or opt-in per `PageFieldSpec`?
7. Which properties are universal semantic targets (`visible`, `disabled`, etc.)?
8. Does a binding failure invalidate one target or the entire document?
9. What reference device/browser defines the performance p95 budgets?
10. Is a later full-script engine required, and if so, must it use Worker/process
    isolation in addition to language restrictions?

## 19. Required changes to the Auth Feature Request after approval

If this draft is accepted, the Auth Feature Request must be amended in these places:

- Ownership boundary: replace the absolute prohibition on expressions with a
  prohibition on unvalidated/free code and network-capable execution.
- Runtime binding section: allow typed expressions in addition to picker-based direct
  bindings.
- Conditions section: replace “Keine freie Expression-Sprache” with a reference to
  this bounded language.
- Security acceptance criteria: require the AST/runtime restrictions from this spec.
- Non-goals: continue forbidding arbitrary JavaScript while allowing the approved
  TypeScript-compatible expression subset.

Until that amendment is approved, the existing Auth Feature Request remains the
normative behavior and expressions remain out of scope.
