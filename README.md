# @loopingai/a2a-protocol

The shared source of truth for Looping's A2A wire contract, so gateways and
agents can't drift apart on claim names or audience derivation.

Zero dependencies. No cryptography, no runtime, no I/O — names and pure string
rules only.

```bash
npm install @loopingai/a2a-protocol
```

```ts
import {
  A2A_JWS_ALG,
  audienceFor,
  gatewayTokenClaims,
  jwksUrl,
  readTenantClaim
} from "@loopingai/a2a-protocol";

// Issuing side
const token = await new SignJWT(gatewayTokenClaims(identity, "reactive"))
  .setProtectedHeader({ alg: A2A_JWS_ALG, kid, jku: jwksUrl(issuer) })
  .setIssuer(issuer)
  .setAudience(audienceFor(agentEndpoint))
  .sign(key);

// Verifying side
const { payload } = await jwtVerify(token, keys, {
  audience: audienceFor(myEndpoint),
  algorithms: [A2A_JWS_ALG]
});
const tenant = readTenantClaim(payload);
```

---

## Why this package exists

The two sides of this contract cannot share code any other way.

`@loopingai/core` is the agent runtime. A gateway is not an agent and must not
import it — that is a security and architecture rule, not a packaging
preference. So the contract lived as a comment in each repo saying _must match
the other_, and it failed exactly as that always does: one side moved to the
`loopingai.org` claim namespace while the other kept minting
`https://looping.ai/tenant`. The verifier read an empty tenant, compared it
against the tenant the request body addressed, and **every request 401'd**.
Nothing in either repo's build noticed, because each side was internally
consistent.

This package is the shared artifact that rule permits: small enough that
depending on it commits a consumer to nothing at all.

## What belongs here

Only the choices **Looping** made where the A2A spec left room.

| Value                            | Why it is ours to define                         |
| -------------------------------- | ------------------------------------------------ |
| `IDENTITY_CLAIM`, `TENANT_CLAIM` | the spec leaves client auth open (§7.4)          |
| `A2A_JWS_ALG` (`EdDSA`)          | the spec permits several; pinning one is ours    |
| `A2A_RPC_PATH` (`/a2a`)          | the spec lets an agent serve anywhere            |
| `JWKS_PATH`                      | RFC 8615 convention, not required by A2A         |
| `audienceFor`                    | the spec does not specify audience derivation    |
| `NOTIFICATION_TOKEN_HEADER`      | the SDK's default, which the SDK does not export |

Two things stay out, and the boundary matters more than the contents.

**What the protocol already fixes _and exports_** stays in `@a2a-js/sdk`.
`AGENT_CARD_PATH`, `A2A_PROTOCOL_VERSION` and `A2A_VERSION_HEADER` are already
shared by both consumers from there; redeclaring them would create a second
source of truth for something that already has one.

The last row of the table is the exception that makes "and exports" matter.
`X-A2A-Notification-Token` is the SDK's own default, but it exists only as an
inline fallback and is never exported — so neither consumer could import it and
both declared it instead. A value nobody can reference has no source of truth to
be a second one of. If the SDK ever exports it, ours should go.

**What either side enforces** stays with that side. The zero-trust verification
chain — `jku` present → origin allowlist → `iss` origin matches `jku` origin →
`jwtVerify` pinned to EdDSA — lives in `@loopingai/core`, and the mirror-image
card and endpoint checks live in the gateway. Neither is shared, because they
are not the same check, and a shared "verify" helper would invite one side to
use the other's. This package holds names and pure functions; holding nothing
else is what makes it safe for both to import.

## Zero dependencies is enforced, not promised

`npm run verify:exports` fails the build if any bare import reaches `dist/`, or
if the manifest declares dependencies of any kind. It runs on `prepack`, on
`prepublishOnly`, and in CI.

That check is the package. One `import { X } from "jose"` and a gateway
depending on this is transitively depending on an agent runtime's toolchain —
silently, in a patch release, which is the whole failure mode this was split out
to prevent. The only global anything here touches is `URL`.

## Changing the contract

**A change to any value here is a change to the wire.** The two sides do not
interoperate across it in either direction, so:

1. Bump the **minor** version. While this package is 0.x, npm reads `^0.1.0` as
   `0.1.x` only — so a minor bump is a hard break that no consumer can pick up
   by running `npm update`. That is the behaviour we want: a wire change should
   require someone to type the new range and notice why.
2. Ship both consumers together. There is no version of this where one side goes
   first and degrades gracefully; a mismatched claim name is a total outage, not
   a partial one.
3. Say so in the release notes.

Patch releases are for documentation and packaging only. If a release changes a
string, it is not a patch.

`src/claims.spec.ts` pins every value as a **literal, not a reference** —
importing a constant and asserting it equals itself tests nothing. Spelling the
string out means a rename has to be made twice, and the second time is the
moment to notice what it costs.

## Development

```bash
npm run check   # prettier, eslint, tsc, build
npm test        # vitest
npm run verify:exports
```

`npm test` alone will not catch a type error — vitest transpiles specs without
typechecking them — so run `check` before pushing.

Node 24, matching `.nvmrc` and every sibling repo. The published output is plain
ES2022 and would run on much less, but a looser `engines` would only invite a
consumer onto a Node the rest of the toolchain does not support.

## License

GPL-3.0-only.
