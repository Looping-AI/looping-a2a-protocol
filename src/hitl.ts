/**
 * Human in the loop: how an agent asks a person something through its
 * gatekeeper, and how the answer comes back.
 *
 * A2A carries the exchange itself. The agent parks its task in
 * `input-required`, and the answer arrives as a new message on that same task.
 * What A2A leaves open is how either side finds the question or the answer
 * inside those messages — a `data` part holds whatever the two parties agree it
 * holds. These names are that agreement. Each part travels beside a `text` part
 * saying the same thing in words, so a client that knows none of this still
 * reads something sensible.
 *
 * Each name is a URI on a host Dynamic Agents owns, the way the claims in
 * `./claims.ts` are. A `data` part's `type` shares one flat namespace with every
 * other party's, so a bare word — or a host somebody else controls — is a
 * collision that surfaces only once two parties disagree about what it holds.
 *
 * The shapes are declared as types only. Whichever side reads a part validates
 * it, with the schema library that side already carries: a validator here would
 * be behaviour, and a dependency.
 */

/** `data.type` of the part an agent puts on its `input-required` status to ask. */
export const HITL_REQUEST_TYPE = "https://dynamicagents.dev/hitl/request";

/** `data.type` of the part a gatekeeper sends onto the parked task with the answer. */
export const HITL_RESPONSE_TYPE = "https://dynamicagents.dev/hitl/response";

/**
 * `data.type` of the part a gatekeeper sends onto the parked task instead of an
 * answer, once nobody gave one before the question expired.
 */
export const HITL_TIMEOUT_TYPE = "https://dynamicagents.dev/hitl/timeout";

/**
 * What is being asked: a yes or no on an action (`approval`), or a pick among
 * options (`choice`).
 *
 * A tuple as well as a type, so a reader can build its validator's enum from the
 * same list the type is derived from, rather than spelling the values again.
 */
export const HITL_REQUEST_KINDS = ["approval", "choice"] as const;

export type HitlRequestKind = (typeof HITL_REQUEST_KINDS)[number];

/**
 * The option ids of an `approval` that names no options of its own.
 *
 * The agent reads the answer by these ids, not by the labels a person saw, so a
 * gatekeeper that renders its own Approve and Reject has to send exactly these
 * back as `optionId`.
 */
export const HITL_APPROVE_OPTION_ID = "approve";
export const HITL_REJECT_OPTION_ID = "reject";

/** One answer a person can pick. */
export interface HitlOption {
  /** What comes back as the answer's `optionId` when this is picked. */
  id: string;
  /** What the person reads. */
  label: string;
  description?: string;
  style?: "primary" | "danger" | "default";
}

/**
 * Something a question asks a person to look at before answering — a plan to
 * approve, say.
 */
export interface HitlArtifact {
  /**
   * The agent's name for it, which the agent acts on when the answer comes back.
   * A gatekeeper has no use for it.
   */
  id: string;
  /** Where a person reads it. */
  url: string;
}

/** The question, as the `data` of a {@link HITL_REQUEST_TYPE} part. */
export interface HitlRequestData {
  type: typeof HITL_REQUEST_TYPE;
  /**
   * Chosen by the agent, and unique to this question. The answer names it, and
   * a gatekeeper sent the same id twice has been sent the same question twice.
   */
  requestId: string;
  requestKind: HitlRequestKind;
  prompt: string;
  /**
   * Omitted on an `approval`, which then means the {@link HITL_APPROVE_OPTION_ID}
   * and {@link HITL_REJECT_OPTION_ID} pair.
   */
  options?: HitlOption[];
  display?: "buttons" | "radio" | "select";
  /** Whether a typed answer is accepted alongside the options. */
  allowFreeform?: boolean;
  /**
   * What the question is about, for a gatekeeper to link beside the prompt. The
   * prompt carries its `url` too, so a gatekeeper that renders none of this
   * still shows it.
   */
  artifact?: HitlArtifact;
}

/**
 * The answer, as the `data` of a {@link HITL_RESPONSE_TYPE} part: an `optionId`,
 * a typed `text`, or both.
 *
 * A union rather than two optional fields, because an answer carrying neither
 * gives the reader nothing to act on, and the type is the cheapest place to
 * refuse one.
 */
export type HitlResponseData = {
  type: typeof HITL_RESPONSE_TYPE;
  requestId: string;
  /** Who answered, in the gatekeeper's own terms. */
  answeredBy: string;
} & ({ optionId: string; text?: string } | { optionId?: string; text: string });

/** The expiry, as the `data` of a {@link HITL_TIMEOUT_TYPE} part. */
export interface HitlTimeoutData {
  type: typeof HITL_TIMEOUT_TYPE;
  requestId: string;
}
