/**
 * The claims and algorithm on a Looping A2A token.
 *
 * The A2A spec (§7.4) says a client must authenticate itself to an agent and
 * leaves the scheme open. Looping's answer is a short-lived EdDSA JWT carrying
 * two namespaced claims. Those names are the wire: they are not configuration,
 * not derived, and not discoverable — the issuer writes them and the verifier
 * reads them, and there is no negotiation step in between where a mismatch
 * could be detected.
 */

/**
 * The JWS algorithm for every signature in the Looping A2A wire — the gateway
 * identity token, the AgentCard signature, and the push-notification callback
 * JWT alike.
 *
 * A single value rather than a list, deliberately. Verifiers pin `algorithms:
 * [A2A_JWS_ALG]`, which is what makes algorithm confusion (`alg: "none"`, or an
 * HMAC verified against a public key) unrepresentable rather than merely
 * unlikely. Widening this to accept a second algorithm is a security decision,
 * not a compatibility one.
 */
export const A2A_JWS_ALG = "EdDSA";

/**
 * Namespaced claim carrying the minimal caller identity.
 *
 * A URI rather than a bare name, per RFC 7519 §4.3: private claims share a flat
 * namespace with every registered claim and every other issuer's, so a bare
 * `identity` is a collision waiting to happen.
 */
export const IDENTITY_CLAIM = "https://loopingai.org/identity";

/**
 * Namespaced claim naming the **tenant** the token authorizes — which of the
 * agents at the audience the call may reach.
 *
 * Load-bearing, not informational. Several agents share one endpoint and
 * therefore one `aud`, so the audience proves the token was minted for *this
 * deployment* and can say nothing about which agent on it. This claim is the
 * only thing that can, which is why a verifier refuses a token that omits it
 * rather than falling back to a default: without it, `tenant` would be an
 * unauthenticated field in the request body, and a token legitimately issued
 * for one agent could be replayed against any of its siblings by editing that
 * field.
 *
 * This exact string is why the package exists. It was once
 * `https://looping.ai/tenant` on one side and `https://loopingai.org/tenant` on
 * the other; the verifier read an empty tenant, compared it to the tenant the
 * body addressed, and **every request 401'd**. Neither repo's build noticed,
 * because each side was internally consistent.
 */
export const TENANT_CLAIM = "https://loopingai.org/tenant";

/**
 * The caller identity as an **issuer mints it** — every field known and
 * present.
 *
 * This is the gateway-agent instance that dispatched the call, not the human
 * end user. Any end user travels unverified, inline in the message text: the
 * issuer deliberately excludes it from the signed claim so a remote agent
 * cannot read the full caller auth context.
 */
export interface RemoteIdentity {
  /** Canonical instance key, e.g. `remote:7:analytics`. Used as `sub`. */
  key: string;
  /** Registry name of the logical agent instance. */
  name: string;
  /** Where the caller runs — `"remote"` on every dispatch to a remote agent. */
  kind: string;
  /** Workspace the calling agent instance belongs to. */
  workspaceId: number;
}

/**
 * The caller identity as a **verifier receives it** — every field optional.
 *
 * The asymmetry with {@link RemoteIdentity} is the point, not an oversight. A
 * verifier gets whatever the issuer put in the claim; a signature proves the
 * payload was not altered, never that it was well-formed. So the only field
 * anything downstream may depend on is {@link RemoteIdentity.key}, and a caller
 * without one is rejected before an agent is ever addressed rather than routed
 * to a default.
 *
 * `RemoteIdentity` is assignable to this type, which is what makes the round
 * trip sound. `claims.spec.ts` asserts that at the type level, so adding a
 * required field to one side fails a test instead of a deployment.
 */
export interface GatewayIdentity {
  /** Canonical instance key, e.g. `remote:7:analytics`. */
  key?: string;
  /** Registry name of the logical agent instance. */
  name?: string;
  /** Dispatch kind of the caller. */
  kind?: string;
  /** Workspace the calling agent instance belongs to. */
  workspaceId?: number | null;
}

/**
 * The two private claims on a minted token, as an object to spread into a JWT
 * payload. Registered claims (`iss`, `aud`, `sub`, `exp`, …) are the signer's
 * business and are not described here.
 */
export type GatewayTokenClaims = Record<typeof IDENTITY_CLAIM, RemoteIdentity> &
  Record<typeof TENANT_CLAIM, string>;

/**
 * Build the private-claims object for a token.
 *
 * Pure — it signs nothing and validates nothing, so it stays usable from a
 * verifier's tests as readily as from the issuer. Its whole job is that the
 * claim keys are spelled by the package that owns them rather than by each
 * caller.
 */
export function gatewayTokenClaims(
  identity: RemoteIdentity,
  tenant: string
): GatewayTokenClaims {
  return {
    [IDENTITY_CLAIM]: identity,
    [TENANT_CLAIM]: tenant
  };
}

/**
 * Read the identity claim off a verified payload.
 *
 * Takes an already-verified payload: this performs no cryptography and must
 * never be reached with an unverified one. It exists so the claim key is read
 * from the same constant it was written with, and so the "absent claim ⇒ empty
 * identity, never a default" rule has one implementation.
 */
export function readIdentityClaim(
  payload: Record<string, unknown>,
  claim: string = IDENTITY_CLAIM
): GatewayIdentity {
  const value = payload[claim];
  // `typeof value === "object"` alone admits `null` and arrays. Both would be
  // returned typed as a `GatewayIdentity` that is not one — harmless at the
  // `.key` lookup that follows, since it reads `undefined` either way and the
  // caller rejects, but a lie to anything that spreads or enumerates it. This
  // package is the shared definition of the shape; returning a value that does
  // not have it is the one thing it must not do.
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as GatewayIdentity)
    : {};
}

/**
 * Read the tenant claim off a verified payload, or `""` when it is missing or
 * not a string.
 *
 * Empty is returned rather than thrown because the caller — which is the only
 * side that knows which tenant the request body addressed — is what compares
 * the two. An empty string matches no tenant, so the missing-claim case fails
 * that comparison instead of bypassing it.
 */
export function readTenantClaim(
  payload: Record<string, unknown>,
  claim: string = TENANT_CLAIM
): string {
  const value = payload[claim];
  return typeof value === "string" ? value : "";
}
