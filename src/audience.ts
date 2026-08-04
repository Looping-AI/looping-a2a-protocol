/**
 * How a token's audience is derived from an agent's endpoint.
 *
 * The A2A spec does not say what `aud` should be. Looping's answer is the
 * agent's exact endpoint — origin **and** path — and both ends derive it with
 * the function below rather than by agreeing on a convention.
 */

/**
 * The `aud` a dispatch token carries: the agent's **exact endpoint**.
 *
 * Not the origin. The audience proves a token was minted for *this service*
 * rather than anything else the host serves — a webhook, an admin API — so it
 * cannot be replayed sideways at a neighbour that happens to trust the same
 * issuer. It says nothing about *which agent* on it: every tenant of a
 * deployment shares one endpoint and so one audience, and `TENANT_CLAIM` is
 * what separates those.
 *
 * The value is never guessed. An issuer resolves the endpoint from the agent's
 * card at registration and stores it, so no path convention exists to be wrong
 * about — an agent serving on `/api/v2/agent` works exactly as one on `/a2a`.
 * The receiving side derives its expected audience from the same place: it
 * builds its card's interface URL as origin + path and verifies that same
 * string. Both ends agree by construction for any path an agent chooses.
 *
 * Rebuilt as `origin + pathname` rather than passed through verbatim, so a
 * query string or fragment on the stored URL cannot change it — and so that the
 * two sides, which store the endpoint in different systems and pick up
 * different incidental decoration along the way, still produce one string.
 * `new URL` also does the case-folding of scheme and host and the dropping of a
 * default port, which is why this is not a substring operation.
 *
 * Throws `TypeError` on a value that is not an absolute URL. Deliberately not
 * caught: an unparseable endpoint means the registration that stored it was
 * already broken, and returning something plausible would move the failure to
 * the far end of an HTTP hop.
 */
export function audienceFor(endpoint: string): string {
  const url = new URL(endpoint);
  return `${url.origin}${url.pathname}`;
}
