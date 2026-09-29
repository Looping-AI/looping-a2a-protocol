/**
 * `@dynamicagents/g2a-protocol` — the Dynamic Agents gatekeeper-to-agent wire
 * contract: the claim names, well-known paths and audience rule a token issuer
 * and an agent runtime must agree on, and the parts a human-in-the-loop
 * question travels in. No runtime, no cryptography, no dependencies.
 *
 * **Changing a published value here is a change to the wire** — bump the minor
 * and ship both consumers together. *Adding* a value is the exception and takes
 * a patch: a name no consumer spells yet has no mismatch to cause. README.md is
 * the full account: why the package exists, what belongs in it, and what
 * changing it costs. AGENTS.md is the working rules for editing it.
 */

export {
  A2A_JWS_ALG,
  IDENTITY_CLAIM,
  TENANT_CLAIM,
  gatekeeperTokenClaims,
  readIdentityClaim,
  readTenantClaim,
  type GatekeeperIdentity,
  type GatekeeperTokenClaims,
  type RemoteIdentity
} from "./claims.js";

export { A2A_RPC_PATH, JWKS_PATH, endpointUrl, jwksUrl } from "./paths.js";

export { audienceFor } from "./audience.js";

export { NOTIFICATION_TOKEN_HEADER } from "./notifications.js";

export { MAX_MESSAGE_TEXT_BYTES } from "./limits.js";

export {
  HITL_APPROVE_OPTION_ID,
  HITL_REJECT_OPTION_ID,
  HITL_REQUEST_KINDS,
  HITL_REQUEST_TYPE,
  HITL_RESPONSE_TYPE,
  HITL_TIMEOUT_TYPE,
  type HitlArtifact,
  type HitlOption,
  type HitlRequestData,
  type HitlRequestKind,
  type HitlResponseData,
  type HitlTimeoutData
} from "./hitl.js";
