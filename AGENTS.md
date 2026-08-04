# AGENTS.md — working in `looping-a2a-protocol`

This package is **a handful of constants and four pure functions**. That is not
an accident or a stage it will grow out of; it is the specification. If a change
here needs a paragraph to justify its size, it belongs in a consumer.

Two services that must never share a runtime — `@loopingai/core` (the agent
runtime) and `looping-gateway` (which must not import it) — both depend on this.
That is only safe while depending on it costs nothing. Every rule below follows
from that one fact.

---

## The three rules

**1. No dependencies. None.**
Not `jose`, not `@a2a-js/sdk`, not `node:*`, not a type-only import. The only
global the _published_ code touches is `URL`; a spec may reach for `Headers` to
prove a header name behaves, and specs never ship.

`scripts/verify-exports.mjs` fails the build on any bare import reaching
`dist/`, and on any `dependencies`, `peerDependencies` or
`optionalDependencies` key in the manifest — check it before assuming a
convenience import is fine.

**2. No behaviour, only names and pure string rules.**
Nothing here signs, verifies, fetches, or reads configuration. The moment this
package can _do_ something, one side will reach for the other side's version of
it, and the boundary that made the split worth doing is gone.

The verification chain stays in core. The card and endpoint checks stay in the
gateway. They are not the same check and must not be made to look like one.

**3. Nothing the A2A spec already fixes _and exports_.**
`AGENT_CARD_PATH`, `A2A_PROTOCOL_VERSION` and `A2A_VERSION_HEADER` come from
`@a2a-js/sdk` in both consumers. Redeclaring any of them creates a second source
of truth for something that already has one — the exact problem this package was
built to remove.

"And exports" is load-bearing, and `NOTIFICATION_TOKEN_HEADER` is why. That name
is the SDK's own default, so on ownership alone it fails this rule — but the SDK
never exports it, it only appears as an inline `?? "X-A2A-Notification-Token"`
fallback. Neither consumer could import it, so both declared it, each with a
comment saying it had to match the other. **A value nobody can reference has no
source of truth to be a second one of.** If the SDK ever exports it, delete ours.

So the test for whether a value belongs here is two questions:

1. **Must two repos spell it identically?** If not, it is local — the gateway's
   `A2A_ENDPOINT_PATH` is `/a2a` too, but it is a placeholder for in-process
   Durable Object cards that nothing on the far side reads, so it stays put.
2. **Can they both import it from somewhere that already owns it?** If yes, they
   should, and it does not come here.

Both must point this way, or it goes elsewhere.

---

## Changing a value

A change here is a change to the wire. The two sides do not interoperate across
it in either direction — a mismatched claim name is a total outage, not a
degraded mode. So:

- **Bump the minor version**, with `npm version minor` rather than by hand.
  While this package is 0.x, npm reads `^0.1.0` as `0.1.x` only, so a minor bump
  is a hard break that no `npm update` picks up — someone has to type the new
  range and notice why. Patch releases are for documentation and packaging; if a
  release changes a string, it is not one.

  Editing `version` or `engines` in `package.json` directly leaves
  `package-lock.json` behind, and **nothing in CI will say so**: `npm ci`
  hard-errors when the _dependencies_ drift, and is silent when the root
  metadata does. It is cosmetic — the tarball and the release workflow both read
  `package.json` — but run `npm install` before committing anyway.

- **Ship both consumers in the same release.** There is no ordering where one
  goes first safely.
- **Update `src/claims.spec.ts` by hand.** Those assertions are literals, not
  references, deliberately — importing a constant and asserting it equals itself
  tests nothing. Having to type the new string twice is the point: the second
  time is when the cost registers.

---

## Working here

```bash
npm run check              # prettier, eslint, tsc, build
npm test                   # vitest
npm run verify:exports     # the publish gate — read it before changing it
```

`npm test` alone will not catch a type error; vitest transpiles specs without
typechecking them.

`tsconfig.json` sets `types: []` and `lib: ["ES2022", "DOM"]`. The empty `types`
is what keeps rule 1 true at the type level — there is no `process`, no `Env`,
no test global in scope. `DOM` is there for the WHATWG types the wire rules are
built on: `URL` in the published code, `Headers` in one spec. Everything else it
drags in is blocked by `no-restricted-globals` in `eslint.config.js`. If you
find yourself widening either, that is the signal the code wants to live in a
consumer instead.

---

## Consumers

| repo              | depends on this for                                       |
| ----------------- | --------------------------------------------------------- |
| `looping-core`    | verifying inbound tokens; re-exported from `/a2a`         |
| `looping-gateway` | minting outbound tokens, and its `/.well-known/jwks.json` |

`looping-core` re-exports these names from `@loopingai/core/a2a` so agents built
on it never install this package directly. The gateway depends on it directly,
which is the arrangement that lets it share the contract while importing none of
the agent runtime.
