import { describe, it, expect, expectTypeOf } from "vitest";
import {
  A2A_JWS_ALG,
  IDENTITY_CLAIM,
  TENANT_CLAIM,
  gatewayTokenClaims,
  readIdentityClaim,
  readTenantClaim,
  type GatewayIdentity,
  type RemoteIdentity
} from "./claims.js";

/**
 * These assertions are **literals, not references**.
 *
 * Importing a constant and asserting it equals itself tests nothing. Spelling
 * the string out means a rename has to be made twice — once in the source, once
 * here — and the second time is the moment to notice that two deployed services
 * stop interoperating the instant one of them ships.
 *
 * That is the whole job of this file. Every other test in this package checks
 * behaviour; these check that a value did not change.
 */

describe("claim names", () => {
  it("carries the caller identity under the Looping namespace", () => {
    expect(IDENTITY_CLAIM).toBe("https://loopingai.org/identity");
  });

  it("carries the authorized tenant under the Looping namespace", () => {
    expect(TENANT_CLAIM).toBe("https://loopingai.org/tenant");
  });

  it("uses loopingai.org, not looping.ai", () => {
    // The exact drift that produced this package: one side minted
    // `https://looping.ai/tenant` while the other read
    // `https://loopingai.org/tenant`, so the verifier saw an empty tenant,
    // compared it against the tenant the request body addressed, and refused
    // every request. Both spellings are plausible; only one is the wire.
    for (const claim of [IDENTITY_CLAIM, TENANT_CLAIM]) {
      expect(claim.startsWith("https://loopingai.org/")).toBe(true);
      expect(claim).not.toContain("looping.ai/");
    }
  });

  it("namespaces both claims as URIs", () => {
    // RFC 7519 §4.3: private claims share a flat namespace with the registered
    // ones. A bare `tenant` would collide with any other issuer's.
    for (const claim of [IDENTITY_CLAIM, TENANT_CLAIM]) {
      expect(() => new URL(claim)).not.toThrow();
    }
  });
});

describe("the signing algorithm", () => {
  it("is EdDSA", () => {
    expect(A2A_JWS_ALG).toBe("EdDSA");
  });

  it("is a single value, so verifiers can pin it", () => {
    // Not an array. A verifier passes `algorithms: [A2A_JWS_ALG]`, which is what
    // makes algorithm confusion — `alg: "none"`, or an HMAC verified against a
    // public key — unrepresentable rather than merely unlikely.
    expect(typeof A2A_JWS_ALG).toBe("string");
  });
});

describe("building a token's claims", () => {
  const identity: RemoteIdentity = {
    key: "remote:7:analytics",
    name: "Analytics",
    kind: "remote",
    workspaceId: 7
  };

  it("puts each value under the claim that owns it", () => {
    const claims = gatewayTokenClaims(identity, "reactive");
    expect(claims["https://loopingai.org/identity"]).toEqual(identity);
    expect(claims["https://loopingai.org/tenant"]).toBe("reactive");
  });

  it("round-trips through the readers", () => {
    const claims = gatewayTokenClaims(identity, "reactive");
    expect(readIdentityClaim(claims)).toEqual(identity);
    expect(readTenantClaim(claims)).toBe("reactive");
  });

  it("adds nothing else", () => {
    // Registered claims are the signer's business. If this package started
    // setting `exp` or `iss`, two signers would disagree about who owns them.
    expect(Object.keys(gatewayTokenClaims(identity, "reactive"))).toHaveLength(
      2
    );
  });
});

describe("reading claims off a verified payload", () => {
  it("returns an empty identity when the claim is absent", () => {
    // Never a default. The only field anything downstream depends on is `key`,
    // and a caller without one is rejected before an agent is addressed.
    expect(readIdentityClaim({})).toEqual({});
    expect(readIdentityClaim({}).key).toBeUndefined();
  });

  it("returns an empty identity when the claim is not an object", () => {
    expect(
      readIdentityClaim({ [IDENTITY_CLAIM]: "remote:7:analytics" })
    ).toEqual({});
    expect(readIdentityClaim({ [IDENTITY_CLAIM]: null })).toEqual({});
    expect(readIdentityClaim({ [IDENTITY_CLAIM]: 7 })).toEqual({});
  });

  it("does not mistake an array for an identity", () => {
    // `typeof [] === "object"` and `[] !== null`, so the obvious guard admits
    // one. It would be returned typed as a `GatewayIdentity` that is not one:
    // harmless at the `.key` lookup that follows, and a lie to anything that
    // spreads or enumerates it afterwards.
    const identity = readIdentityClaim({ [IDENTITY_CLAIM]: ["a", "b"] });
    expect(identity).toEqual({});
    expect(Array.isArray(identity)).toBe(false);
  });

  it("returns an empty tenant when the claim is absent or not a string", () => {
    // Empty rather than thrown: the caller is the only side that knows which
    // tenant the request body addressed, and `""` matches none of them — so the
    // missing-claim case fails that comparison instead of bypassing it.
    expect(readTenantClaim({})).toBe("");
    expect(readTenantClaim({ [TENANT_CLAIM]: 7 })).toBe("");
    expect(readTenantClaim({ [TENANT_CLAIM]: "" })).toBe("");
  });

  it("honours an overridden claim name for a non-Looping issuer", () => {
    expect(
      readTenantClaim(
        { "https://other.test/tenant": "reactive" },
        "https://other.test/tenant"
      )
    ).toBe("reactive");
  });
});

describe("the mint and verify shapes", () => {
  it("makes a minted identity assignable to a received one", () => {
    // The asymmetry is deliberate — an issuer knows every field, a verifier
    // trusts none — but the round trip only holds while this assignment does.
    // Adding a required field to `GatewayIdentity`, or narrowing one of its
    // types, breaks it here rather than at a consumer's build.
    expectTypeOf<RemoteIdentity>().toExtend<GatewayIdentity>();
  });

  it("makes every received field optional", () => {
    // `{}` is a valid `GatewayIdentity`: it is whatever the issuer put there,
    // and a signature proves the payload was not altered, never that it was
    // well-formed.
    expectTypeOf<Record<string, never>>().toExtend<GatewayIdentity>();
  });
});
