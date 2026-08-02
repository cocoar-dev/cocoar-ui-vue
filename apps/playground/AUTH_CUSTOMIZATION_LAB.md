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

For each slot the lab exposes the fixed reference, the live JSON renderer, the
real visual PageBuilder and the persisted JSON document. The viewport selector
covers 320 px compact, phone, tablet, desktop and a fluid host container.

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
