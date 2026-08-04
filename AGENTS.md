# AGENTS.md — working in `looping-a2a-protocol`

This package is **60 lines of constants and three pure functions**. That is not
an accident or a stage it will grow out of; it is the specification.

Two services that must never share a runtime — `@loopingai/core` (the agent
runtime) and `looping-gateway` (which must not import it) — both depend on this.
That is only safe while depending on it costs nothing. Every rule below follows
from that one fact.

---

## The three rules

**1. No dependencies. None.**
Not `jose`, not `@a2a-js/sdk`, not `node:*`, not a type-only import. The only
global anything here may touch is `URL`. `scripts/verify-exports.mjs` fails the
build on any bare import reaching `dist/`, and on any `dependencies`,
`peerDependencies` or `optionalDependencies` key in the manifest — check it
before assuming a convenience import is fine.

**2. No behaviour, only names and pure string rules.**
Nothing here signs, verifies, fetches, or reads configuration. The moment this
package can _do_ something, one side will reach for the other side's version of
it, and the boundary that made the split worth doing is gone.

The verification chain stays in core. The card and endpoint checks stay in the
gateway. They are not the same check and must not be made to look like one.

**3. Nothing the A2A spec already fixes.**
`AGENT_CARD_PATH` and `A2A_PROTOCOL_VERSION` come from `@a2a-js/sdk` in both
consumers. Redeclaring either creates a second source of truth for something
that already has one — the exact problem this package was built to remove.

The test for whether a value belongs here: **did Looping choose it, and do two
repos have to spell it identically?** Both, or it goes elsewhere.

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
no test global in scope. `DOM` is present for exactly one type, the WHATWG
`URL`, and `no-restricted-globals` in `eslint.config.js` blocks the browser
globals it drags in with it. If you find yourself widening either, that is the
signal the code wants to live in a consumer instead.

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
