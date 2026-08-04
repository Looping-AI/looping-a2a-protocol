import { describe, it, expect } from "vitest";
import { A2A_RPC_PATH, JWKS_PATH, endpointUrl, jwksUrl } from "./paths.js";
import { audienceFor } from "./audience.js";

const ORIGIN = "https://agent.example.com";

describe("path literals", () => {
  it("pins the default JSON-RPC path", () => {
    expect(A2A_RPC_PATH).toBe("/a2a");
  });

  it("pins the JWKS path", () => {
    // Where a verifier fetches keys after checking the origin against its
    // allowlist. Written as a literal in three files across two repos before
    // this package existed.
    expect(JWKS_PATH).toBe("/.well-known/jwks.json");
  });

  it("keeps the JWKS under /.well-known/, so it is per-authority", () => {
    // RFC 8615. One origin publishes one key set and every agent sharing that
    // origin verifies against it; distinct keys per agent needs distinct
    // origins.
    expect(JWKS_PATH.startsWith("/.well-known/")).toBe(true);
  });
});

describe("jwksUrl", () => {
  it("composes the jku a signer advertises", () => {
    expect(jwksUrl(ORIGIN)).toBe(`${ORIGIN}/.well-known/jwks.json`);
  });

  it("tolerates a trailing slash on the origin", () => {
    // `${origin}${JWKS_PATH}` is what both sides wrote by hand, and it is
    // correct only while the origin has none. A stored or configured value very
    // often does, and `https://x.test//.well-known/jwks.json` fetches fine from
    // some servers and 404s on others — a failure that depends on how a value
    // was typed rather than on what it means.
    expect(jwksUrl(`${ORIGIN}/`)).toBe(jwksUrl(ORIGIN));
    expect(jwksUrl(`${ORIGIN}///`)).toBe(jwksUrl(ORIGIN));
  });

  it("produces a URL whose origin is the one it was given", () => {
    // The allowlist check compares origins, so this is the property that makes
    // it meaningful: a verifier that allows `ORIGIN` must accept this jku.
    expect(new URL(jwksUrl(ORIGIN)).origin).toBe(ORIGIN);
  });
});

describe("endpointUrl", () => {
  it("defaults to the JSON-RPC path", () => {
    expect(endpointUrl(ORIGIN)).toBe(`${ORIGIN}/a2a`);
  });

  it("accepts any path an agent chooses to serve on", () => {
    expect(endpointUrl(ORIGIN, "/api/v2/agent")).toBe(`${ORIGIN}/api/v2/agent`);
  });

  it("tolerates a path written without its leading slash", () => {
    expect(endpointUrl(ORIGIN, "a2a")).toBe(endpointUrl(ORIGIN));
  });

  it("tolerates a trailing slash on the origin", () => {
    expect(endpointUrl(`${ORIGIN}/`)).toBe(endpointUrl(ORIGIN));
  });
});

describe("the card URL and the audience", () => {
  it("agree for the default path", () => {
    // The load-bearing relationship in this package. An agent builds its card's
    // interface `url` with `endpointUrl`; an issuer reads that URL off the card
    // and mints `aud` with `audienceFor`; the agent verifies against its own
    // `endpointUrl` again. All three are one string or none of it works.
    expect(audienceFor(endpointUrl(ORIGIN))).toBe(endpointUrl(ORIGIN));
  });

  it("agree for any path", () => {
    for (const path of ["/a2a", "/api/v2/agent", "/", "/deep/nested/rpc"]) {
      expect(audienceFor(endpointUrl(ORIGIN, path))).toBe(
        endpointUrl(ORIGIN, path)
      );
    }
  });

  it("agree even when the origin was written with a trailing slash", () => {
    // One side stores the origin from a config value, the other from a parsed
    // request. This is where those two spellings would otherwise diverge into a
    // 401 naming the audience rather than the mistake.
    expect(audienceFor(endpointUrl(`${ORIGIN}/`))).toBe(endpointUrl(ORIGIN));
  });
});
