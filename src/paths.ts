/**
 * The paths a Looping agent serves on, and how a URL is composed from an
 * origin.
 *
 * Only what the A2A spec leaves open is here. `AGENT_CARD_PATH` is **not**: the
 * spec fixes it and `@a2a-js/sdk` exports it, so redeclaring it would create a
 * second source of truth for something already shared. The rule for this
 * package is narrow on purpose — it owns the choices Looping made, and nothing
 * the protocol already decided.
 */

/**
 * The JSON-RPC path an agent answers on by default.
 *
 * A default, not a constant of the protocol: an agent may serve anywhere, and
 * its card advertises the URL it actually chose. Nothing derives an endpoint by
 * assuming this path — a client reads the card. It is here so both ends spell
 * the same default, not so either end can skip the lookup.
 */
export const A2A_RPC_PATH = "/a2a";

/**
 * The path serving a party's public JWKS — the `jku` on every token it signs.
 *
 * Under `/.well-known/` per RFC 8615, which makes it per-authority: one origin
 * publishes one key set, and every agent sharing that origin verifies against
 * it. A deployment that needs distinct keys per agent needs distinct origins.
 */
export const JWKS_PATH = "/.well-known/jwks.json";

/**
 * Join an origin and a path without producing a doubled or missing slash.
 *
 * `${origin}${path}` is what both sides write by hand today, and it is correct
 * only while the origin has no trailing slash. `new URL("https://x.test/")`
 * yields an `origin` without one, but a configured or stored value very often
 * carries it, and the result — `https://x.test//.well-known/jwks.json` — is a
 * URL that fetches fine from some servers and 404s on others. Normalizing here
 * means the failure cannot depend on how a value was written down.
 */
function join(origin: string, path: string): string {
  return `${origin.replace(/\/+$/, "")}${path}`;
}

/**
 * Where a party publishes its public keys, given its origin.
 *
 * This is the value that goes in the `jku` protected header and the URL a
 * verifier fetches after checking that origin against its allowlist. Both ends
 * composing it the same way is what makes the allowlist check meaningful.
 */
export function jwksUrl(origin: string): string {
  return join(origin, JWKS_PATH);
}

/**
 * An agent's JSON-RPC endpoint, given its origin and the path it serves on.
 *
 * The same string in three places that must agree: the `url` on the card's
 * JSONRPC interface, the audience a token is minted for, and the audience a
 * verifier expects. {@link audienceFor} derives the last two from whatever the
 * card advertised, so an agent on `/api/v2/agent` works exactly as one on the
 * default — but when a card is being *built*, this is what builds it.
 */
export function endpointUrl(
  origin: string,
  rpcPath: string = A2A_RPC_PATH
): string {
  return join(origin, rpcPath.startsWith("/") ? rpcPath : `/${rpcPath}`);
}
