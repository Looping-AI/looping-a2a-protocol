# @dynamicagents/g2a-protocol

The shared source of truth for the Dynamic Agents **gatekeeper-to-agent** wire
contract, so gatekeepers and agents can't drift apart on claim names, audience
derivation, or how a question for a human is carried.

Zero dependencies. No cryptography, no runtime, no I/O — names and pure string
rules only.

```bash
npm install @dynamicagents/g2a-protocol
```

```ts
import {
  A2A_JWS_ALG,
  audienceFor,
  gatekeeperTokenClaims,
  jwksUrl,
  readTenantClaim
} from "@dynamicagents/g2a-protocol";

// Issuing side
const token = await new SignJWT(gatekeeperTokenClaims(identity, "generic"))
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

## Why `g2a`

**Gatekeeper-to-agent.** Agents here never call each other directly. Every call
that leaves an agent goes through a _gatekeeper_ — the service that mints the
token this package describes — so that anything an agent does beyond its own
boundary stays observable to a human. Direct agent-to-agent traffic would route
around exactly that, which is why the protocol is not named for it.

This is not a limit on what an agent may contain. An agent is free to run
subagents, and those never appear here: they are calls inside one agent's own
boundary, not an external protocol. `g2a` governs the boundary crossing and
nothing within it.

What crosses that boundary is still **A2A**. The gatekeeper-to-agent link speaks
the A2A protocol as specified — this package adds only the authentication
choices A2A deliberately leaves open (§7.4) and defers to `@a2a-js/sdk` for
everything the spec already fixes. `g2a` is _who_ may talk to _whom_; `a2a` is
_how_ they talk.

## Why this package exists

The two sides of this contract cannot share code any other way.

`@dynamicagents/core` is the agent runtime. A gatekeeper is not an agent and
must not import it — that is a security and architecture rule, not a packaging
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

Only the choices **Dynamic Agents** made where the A2A spec left room.

| Value                            | Why it is ours to define                                |
| -------------------------------- | ------------------------------------------------------- |
| `IDENTITY_CLAIM`, `TENANT_CLAIM` | the spec leaves client auth open (§7.4)                 |
| `A2A_JWS_ALG` (`EdDSA`)          | the spec permits several; pinning one is ours           |
| `A2A_RPC_PATH` (`/a2a`)          | the spec lets an agent serve anywhere                   |
| `JWKS_PATH`                      | RFC 8615 convention, not required by A2A                |
| `audienceFor`                    | the spec does not specify audience derivation           |
| `HITL_*`                         | the spec leaves what a `data` part holds to the parties |
| `MAX_MESSAGE_TEXT_BYTES`         | the spec bounds no message, and both ends must          |
| `NOTIFICATION_TOKEN_HEADER`      | the SDK's default, which the SDK does not export        |

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
`jwtVerify` pinned to EdDSA — lives in `@dynamicagents/core`, and the
mirror-image card and endpoint checks live in the gatekeeper. Neither is
shared, because they are not the same check, and a shared "verify" helper would
invite one side to use the other's. This package holds names and pure functions;
holding nothing else is what makes it safe for both to import.

## Zero dependencies is enforced, not promised

`npm run verify:exports` fails the build if any bare import reaches `dist/`, or
if the manifest declares dependencies of any kind. It runs on `prepack`, on
`prepublishOnly`, and in CI.

That check is the package. One `import { X } from "jose"` and a gatekeeper
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

**Adding** a value is the one thing that is. A name no consumer spells yet has no
mismatch to cause, so there is no release where a consumer that ignores it stops
working — and a patch is what lets both sides pick it up without either editing a
range. 0.4.1 added `MAX_MESSAGE_TEXT_BYTES` on exactly that basis. The asymmetry
is deliberate and does not carry forward: once a value is published, changing it
is a minor like any other.

**0.3.0 is exactly such a release.** The claim namespace moved from
`https://loopingai.org/*` to `https://dynamicagents.dev/*`, and the package was
renamed from `@loopingai/a2a-protocol`. A token minted under the old namespace
reads as an empty tenant under the new one, so `@dynamicagents/core` and
`slack-gatekeeper` have to adopt it in the same deploy.

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

Apache-2.0.
