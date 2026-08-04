/**
 * The push-notification callback hop — agent back to the issuer.
 *
 * The A2A async contract has two legs. The issuer dispatches `SendMessage` with
 * a `taskPushNotificationConfig` (a webhook `url` and a validation `token`), the
 * agent accepts immediately with a `submitted` Task, and later POSTs the
 * terminal Task to that webhook. This module holds the one value both ends of
 * that second leg must spell identically.
 */

/**
 * Header carrying the per-task validation `token` from the
 * `taskPushNotificationConfig`, echoed verbatim on the callback so the issuer
 * can correlate it to the pending task it created.
 *
 * ## Why this is here, when the other values are Looping's choices
 *
 * It is not one. `@a2a-js/sdk` uses `X-A2A-Notification-Token` as the default
 * `tokenHeaderName` in `DefaultPushNotificationSender`, so the name comes from
 * the protocol's own tooling.
 *
 * That normally means it belongs in the SDK and not here — the rule is that
 * nothing the protocol already fixes gets redeclared, because a second source
 * of truth is the problem this package exists to remove. The exception is
 * narrow and mechanical: **the SDK does not export it.** It exists only as an
 * inline default inside an options fallback. `A2A_VERSION_HEADER` and
 * `HTTP_EXTENSION_HEADER` are exported constants and are correctly imported
 * from the SDK by both consumers; this one cannot be, so both declared it, each
 * with a comment saying it had to match the other. That is the same failure
 * mode as the claim names, arrived at from the opposite direction.
 *
 * If the SDK ever exports it, this should be deleted in favour of that.
 *
 * ## Case
 *
 * Spelled lowercase, while the SDK's default is `X-A2A-Notification-Token`.
 * That is not a discrepancy: HTTP field names are case-insensitive (RFC 9110
 * §5.1), `Headers` normalizes on both set and get, and HTTP/2 requires
 * lowercase on the wire regardless. Lowercase is what both Looping repos have
 * always sent and read, so adopting it here changes no bytes.
 *
 * ## Lifetime
 *
 * The SDK marks the token-header mechanism `@deprecated` in favour of
 * `pushConfig.authentication` with `AuthenticationInfo`. This is the shared
 * spelling for as long as the token mechanism is in use, not an endorsement of
 * it over the newer one — and having it in one place is what makes migrating
 * off it a single coordinated change rather than two.
 */
export const NOTIFICATION_TOKEN_HEADER = "x-a2a-notification-token";
