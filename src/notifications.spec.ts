import { describe, it, expect } from "vitest";
import { NOTIFICATION_TOKEN_HEADER } from "./notifications.js";

describe("the push-notification token header", () => {
  it("is the name both ends of the callback spell", () => {
    // A literal, not a reference — see claims.spec.ts. This one was declared
    // twice, in `@loopingai/core` and in looping-gateway, each with a comment
    // saying it had to match the other.
    expect(NOTIFICATION_TOKEN_HEADER).toBe("x-a2a-notification-token");
  });

  it("matches the SDK's default under HTTP field-name rules", () => {
    // `@a2a-js/sdk` defaults `tokenHeaderName` to `X-A2A-Notification-Token`.
    // The package spells it lowercase, which is what both repos have always
    // sent and read. Pinned as an equivalence rather than an equality, because
    // that is exactly what HTTP guarantees (RFC 9110 §5.1) and what `Headers`
    // implements — if this ever stopped holding, the two would be different
    // headers and the callback token would silently go unread.
    const SDK_DEFAULT = "X-A2A-Notification-Token";
    expect(NOTIFICATION_TOKEN_HEADER.toLowerCase()).toBe(
      SDK_DEFAULT.toLowerCase()
    );
  });

  it("round-trips through Headers case-insensitively, as sent and as read", () => {
    // The property the case difference above rests on, asserted against a real
    // `Headers` rather than assumed: an agent writing the lowercase name and an
    // issuer reading the SDK's spelling — or the reverse — find the same value.
    const sent = new Headers({ [NOTIFICATION_TOKEN_HEADER]: "tok-123" });
    expect(sent.get("X-A2A-Notification-Token")).toBe("tok-123");

    const received = new Headers({ "X-A2A-Notification-Token": "tok-123" });
    expect(received.get(NOTIFICATION_TOKEN_HEADER)).toBe("tok-123");
  });

  it("is a valid HTTP field name", () => {
    // A token per RFC 9110 §5.6.2 — no spaces, no separators. A header name
    // that is not one throws at `Headers` construction, which would surface as
    // a failed callback rather than a validation error.
    expect(NOTIFICATION_TOKEN_HEADER).toMatch(/^[!#$%&'*+\-.^_`|~0-9a-z]+$/);
    expect(
      () => new Headers({ [NOTIFICATION_TOKEN_HEADER]: "x" })
    ).not.toThrow();
  });
});
