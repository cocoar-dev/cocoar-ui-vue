# Auth Customization Lab

This playground route is the executable hand-off for bringing Modgud's built-in
authentication pages to JSON/PageBuilder parity without coupling the experiment
to the .NET application. Runtime and default Auth documents are imported from
the public `@cocoar/vue-page-builder` beta API; no production integration code
lives only in this Playground.

## Run it

```sh
pnpm --filter @cocoar/playground dev
```

Open <http://localhost:5188/auth-customization-lab>.

The detailed package-team request and acceptance criteria live in
[`PAGE_BUILDER_AUTH_FEATURE_REQUEST.md`](./PAGE_BUILDER_AUTH_FEATURE_REQUEST.md).

## Included page slots

- Login
- Forgot password
- Logout
- OAuth/OIDC consent with a dynamic `RequestedScopes[]` fixture

For each slot the lab exposes the fixed reference, the live JSON renderer, the
real visual PageBuilder and the persisted JSON document. The viewport selector
covers 320 px compact, phone, tablet, desktop and a fluid host container.

The renderer and Builder preview both execute the current code-authoring model:

- one browser-only SES Worker session per selected page;
- customer-authored `definePageState(...)` shared by the page;
- constrained `defineElement(...)` code per named element;
- registry-driven Quick Properties that write deterministic locked assignments
  into the same element source;
- reactive `page.fields`, `page.form`, allowlisted `page.context` and
  `page.viewport` inputs;
- host-owned action handlers, API access and navigation.

The Login submit button is the smallest executable example. Its disabled state
is computed from `page.fields.username`, `page.fields.password`,
`page.form.valid` and `page.form.submitting`. It is not a Login-specific
component or a special disabled-expression input in the editor.

The **View contract** mode is part of the hand-off, not optional documentation.
For the selected slot it records runtime inputs, required states, actions,
non-negotiable security/behaviour rules and responsive/accessibility cases.

| View | Hidden requirements that must survive customization |
| --- | --- |
| Login | Capability/provider variants, MFA continuation, password/autofill semantics, duplicate-submit protection, preserved continuation and values on failure |
| Forgot password | Enumeration-safe success text, rate-limit/error states, passwordless variant, host-owned reset links and preserved continuation |
| Logout | Session invalidated before rendering, local/federated outcomes, cache safety and host-validated post-logout navigation |
| Consent | Ticket ownership/expiry, immutable client and scope identity, required scopes, dynamic-client warnings, `RequestedScopes[]` → `ApprovedScopes[]`, safe authorize retry and host-owned redirects |

## Deterministic API edge cases

The Vite plugin in `auth-lab-api.ts` is a deliberately small Node/Connect API.
Use these usernames in Login or Forgot password:

| Username | Result |
| --- | --- |
| `invalid` | Validation/authentication rejection |
| `locked` | Locked account (Login) |
| `server-error` | HTTP 500 |
| `slow` | Client timeout and abort after 1.8 seconds |
| `disconnect` | Socket is destroyed to simulate a broken connection |
| `mfa` | Successful MFA continuation (Login) |
| anything else | Success |

Consent has its own runtime controls: 1, 3 or 8 requested scopes and deterministic
success, expired-ticket, server-error, timeout and broken-connection outcomes.
The scope list is intentionally server-shaped data. Required entries stay selected,
optional entries can be toggled, and Allow submits the resulting
`ApprovedScopes[]`.

The expected invariant for every failure is: the route does not change, the
current page remains mounted, and entered form values remain available for a
retry.

## Ownership boundary

The page JSON owns visual structure, copy placement, Page State and per-element
configuration code. The code may update an element's allowed draft properties,
but cannot add/delete elements or change their `type`/`name`. Runtime data such
as product/realm identity, legal-link availability, external providers and
requested consent scopes is supplied by the host through explicitly declared
context contracts.

Authentication, authorization, API calls, tickets, redirects and other effects
remain host-owned. No `api`, `fetch`, `window` or similar capability exists in a
page session unless the host explicitly supplies a data-only capability contract.
Browser tab title, email sender settings and other non-visual metadata remain
outside the PageBuilder.

The in-app **Use cases & gaps** matrix now doubles as an executable acceptance
matrix. Responsive overrides, token-aware styles, localization, multi-state
pages, schema-positioned feedback and native repeat/selection arrays are backed
by the actual generic PageBuilder primitives. Consent uses no consumer-specific
scope component: the generic repeater turns the allowlisted
`consent.requestedScopes` array into the freely named `approvedScopes` action
value. Newly arriving default-selected items are selected without reselecting a
value the user already unchecked.

## Verification

`packages/page-builder/src/presets/authCustomization.test.ts` validates all four generated documents, including Page
State, safe unique element names and Element Code. The Playwright suite verifies:

- reactive Login disabled/enabled transitions;
- API rejection, timeout and value preservation;
- every page slot at the 320 px compact fixture without horizontal overflow;
- the real Builder, Quick Properties, Monaco Element Code and persisted code;
- dynamic consent arrays, selected-key submission and expired-ticket feedback;
- the security/behaviour contract for every slot.
