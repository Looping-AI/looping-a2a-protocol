import { describe, it, expect } from "vitest";
import { audienceFor } from "./audience.js";

const ENDPOINT = "https://agent.example.com/a2a";

describe("audienceFor", () => {
  it("is the agent's endpoint — origin plus path", () => {
    expect(audienceFor(ENDPOINT)).toBe(ENDPOINT);
  });

  it("does not collapse to the origin", () => {
    // The failure this guards: minting `aud: origin` against an agent that
    // advertises `origin + /a2a` is a 401 on every request, and the message
    // names the audience rather than the mistake.
    expect(audienceFor(ENDPOINT)).not.toBe("https://agent.example.com");
  });

  it("keeps a non-default path", () => {
    // No path convention exists to be wrong about — an agent serving on
    // `/api/v2/agent` is as valid as one on `/a2a`, because both ends derive
    // the audience from the endpoint the card advertised.
    expect(audienceFor("https://agent.example.com/api/v2/agent")).toBe(
      "https://agent.example.com/api/v2/agent"
    );
  });

  it("drops the query and fragment", () => {
    // The two sides store the endpoint in different systems and pick up
    // different incidental decoration along the way. Rebuilding from `origin +
    // pathname` is what makes them produce one string anyway.
    expect(audienceFor("https://agent.example.com/a2a?x=1#f")).toBe(ENDPOINT);
  });

  it("folds the case of the scheme and host, but not the path", () => {
    // `new URL` normalizes the authority and leaves the path alone — which is
    // correct, since paths are case-sensitive. Doing this by hand is where a
    // substring implementation would diverge.
    expect(audienceFor("HTTPS://Agent.Example.COM/a2a")).toBe(ENDPOINT);
    expect(audienceFor("https://agent.example.com/A2A")).toBe(
      "https://agent.example.com/A2A"
    );
  });

  it("drops a default port and keeps an explicit one", () => {
    expect(audienceFor("https://agent.example.com:443/a2a")).toBe(ENDPOINT);
    expect(audienceFor("https://agent.example.com:8443/a2a")).toBe(
      "https://agent.example.com:8443/a2a"
    );
  });

  it("distinguishes a bare origin from its root path", () => {
    // `new URL` supplies the `/`, so both spellings land on the same audience.
    // Worth pinning: it is the one case where the two sides can write the
    // endpoint differently and still agree.
    expect(audienceFor("https://agent.example.com")).toBe(
      "https://agent.example.com/"
    );
    expect(audienceFor("https://agent.example.com/")).toBe(
      "https://agent.example.com/"
    );
  });

  it("treats a trailing slash on a path as a different audience", () => {
    // It is — servers route them differently, so folding them here would mint
    // a token for an endpoint that may not exist.
    expect(audienceFor("https://agent.example.com/a2a/")).not.toBe(ENDPOINT);
  });

  it("is idempotent", () => {
    // Both sides may derive the audience from a value that has already been
    // through this function. Applying it twice must not change the answer.
    for (const input of [
      ENDPOINT,
      "https://agent.example.com/a2a?x=1#f",
      "https://agent.example.com",
      "https://agent.example.com:443/a2a"
    ]) {
      expect(audienceFor(audienceFor(input))).toBe(audienceFor(input));
    }
  });

  it("throws on a value that is not an absolute URL", () => {
    // Not caught: an unparseable endpoint means the registration that stored it
    // was already broken, and returning something plausible would move the
    // failure to the far end of an HTTP hop.
    expect(() => audienceFor("agent.example.com/a2a")).toThrow();
    expect(() => audienceFor("")).toThrow();
  });
});
