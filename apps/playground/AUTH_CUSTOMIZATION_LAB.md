# Auth Customization Lab

This playground route is the executable hand-off for bringing Modgud's built-in
authentication pages to JSON/PageBuilder parity without coupling the experiment
to the .NET application.

## Run it

```sh
pnpm --filter @cocoar/playground dev
```

Open <http://localhost:5188/auth-customization-lab>.

## Included page slots

- Login
- Forgot password
- Logout
- OAuth/OIDC consent with a dynamic `RequestedScopes[]` fixture

For each slot the lab exposes the fixed reference, the live JSON renderer, the
real visual PageBuilder and the persisted JSON document. The viewport selector
covers 320 px compact, phone, tablet, desktop and a fluid host container.

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

The page JSON owns visual structure, copy placement and actions. Registered host
elements own runtime data that cannot safely be persisted into a design:
product/realm identity, legal links and a dynamic list of external providers.
Browser tab title, email sender settings and other non-visual metadata remain
outside the PageBuilder.

The in-app **Use cases & gaps** matrix is the package backlog. In particular,
the current builder still needs responsive overrides and viewport previews,
token-aware visual styles, typography, elevation, host-context conditions,
localized values, multi-state page variants and schema-positioned form feedback.
Consent additionally defines the native array/repeater requirement: a safe host-array
binding, item alias and stable key, repeatable child template, per-item form values and
array-shaped action output. The registered consent-scopes element demonstrates the
current consumer-owned workaround, not the desired final API.
