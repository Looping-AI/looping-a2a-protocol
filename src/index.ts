/**
 * `@loopingai/a2a-protocol` — the Looping A2A wire contract.
 *
 * The claim names, well-known paths, and audience rule that a token issuer and
 * an agent runtime must agree on, with **no runtime and no cryptography**.
 *
 * ## Why this is its own package
 *
 * The two sides of this contract cannot share code any other way.
 * `@loopingai/core` is the agent runtime; a gateway is not an agent and must
 * not import it. So the contract lived as a comment in each repo saying "must
 * match the other," which failed exactly as that always does: one side moved to
 * the `loopingai.org` claim namespace, the other kept minting
 * `https://looping.ai/tenant`, the verifier read an empty tenant, and every
 * request 401'd. Both builds were green, because each side was internally
 * consistent.
 *
 * This package is small enough that depending on it commits a consumer to
 * nothing. It has no dependencies, imports no module — not `jose`, not
 * `@a2a-js/sdk`, not `node:*` — and touches no global but `URL`. That is
 * enforced at publish time by `npm run verify:exports`, not by convention:
 * a bare import anywhere in `dist/` fails the build. It is what lets a gateway
 * depend on this while still importing nothing of the agent runtime.
 *
 * ## What belongs here
 *
 * Only the choices **Looping** made where the A2A spec left room:
 *
 * | | |
 * |---|---|
 * | claim names | the spec leaves client auth open (§7.4) |
 * | `EdDSA` | the spec permits many; pinning one is what we chose |
 * | `/a2a` | the spec lets an agent serve anywhere |
 * | `/.well-known/jwks.json` | RFC 8615, but not required by A2A |
 * | `audienceFor` | the spec does not specify audience derivation |
 *
 * Anything the protocol itself fixes stays in `@a2a-js/sdk` — `AGENT_CARD_PATH`
 * and `A2A_PROTOCOL_VERSION` are already shared and are deliberately not
 * redeclared here. Anything either side *enforces* stays with that side: the
 * zero-trust verification checks live in `@loopingai/core`, the card and
 * endpoint checks live in the gateway. This package holds names and pure string
 * rules, and holding nothing else is what keeps it safe for both to import.
 *
 * ## Changing it
 *
 * A change to any value here is a change to the wire. The two sides do not
 * interoperate across it in either direction, so while this package is 0.x the
 * minor version is the signal — npm reads `^0.1.0` as `0.1.x` only, so a minor
 * bump is a break no consumer picks up by accident. **Bump it, and ship both
 * consumers together.**
 */

export {
  A2A_JWS_ALG,
  IDENTITY_CLAIM,
  TENANT_CLAIM,
  gatewayTokenClaims,
  readIdentityClaim,
  readTenantClaim,
  type GatewayIdentity,
  type GatewayTokenClaims,
  type RemoteIdentity
} from "./claims.js";

export { A2A_RPC_PATH, JWKS_PATH, endpointUrl, jwksUrl } from "./paths.js";

export { audienceFor } from "./audience.js";
