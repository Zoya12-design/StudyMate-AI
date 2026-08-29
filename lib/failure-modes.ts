/**
 * FE-08 — the failure inventory for the chat flow, kept in one place.
 *
 * Every entry below is a real way the primary flow (type a question → stream an
 * answer) can break. The `id` is the contract between the Failure Lab in the UI
 * and the sabotage switch in `app/api/chat/route.ts`, so a reviewer can trigger
 * each handled state on the deployed URL instead of having to unplug their
 * network at exactly the right millisecond.
 *
 * Pure data and pure functions only — this module is imported by both the
 * server route and client components.
 */

export type FailureId =
  | "http-500"
  | "mid-stream"
  | "rate-limit"
  | "slow"
  | "empty"
  | "offline";

export type FailureMode = {
  id: FailureId;
  label: string;
  icon: string;
  /** What actually goes wrong. */
  cause: string;
  /** What the user sees instead of a dead screen. */
  handling: string;
  /** false → simulated in the browser; the request never leaves the client. */
  serverSide: boolean;
};

export const FAILURE_MODES: readonly FailureMode[] = [
  {
    id: "http-500",
    label: "API error (500)",
    icon: "🚫",
    cause: "The route fails before a single token is streamed.",
    handling:
      "Designed error banner with the reason, plus a Retry that resends only the failed turn.",
    serverSide: true,
  },
  {
    id: "mid-stream",
    label: "Connection dies mid-stream",
    icon: "✂️",
    cause: "The response stream is cut after the first few tokens.",
    handling:
      "The partial answer stays on screen, flagged incomplete, with a working Retry.",
    serverSide: true,
  },
  {
    id: "rate-limit",
    label: "Rate limit (429)",
    icon: "⏳",
    cause: "Free-tier keys allow only a few requests per minute.",
    handling:
      "Rate-limit-specific copy that tells the student to wait, instead of a generic failure.",
    serverSide: true,
  },
  {
    id: "slow",
    label: "Slow response",
    icon: "🐢",
    cause: "The model takes several seconds before the first token arrives.",
    handling:
      "A skeleton shaped like the real answer, then a “still working” note so it never looks frozen.",
    serverSide: true,
  },
  {
    id: "empty",
    label: "Empty response",
    icon: "🫥",
    cause: "The stream completes without producing any text.",
    handling:
      "An explicit “no answer came back” card with Retry — not a silent blank bubble.",
    serverSide: true,
  },
  {
    id: "offline",
    label: "Network offline",
    icon: "📴",
    cause:
      "The device loses its connection (the real browser `offline` event, or forced here).",
    handling:
      "Offline banner, the composer locks, and whatever was typed is preserved.",
    serverSide: false,
  },
];

/** Edge cases handled without a simulation — documented for the README table. */
export const GUARDED_EDGE_CASES: readonly { case: string; handling: string }[] =
  [
    {
      case: "Empty / whitespace-only input",
      handling:
        "Send stays disabled and Enter is a no-op, so no empty request ever reaches the model.",
    },
    {
      case: "Over-long input (> 2000 chars)",
      handling:
        "A live counter turns red and blocks the send before it can be rejected by the API.",
    },
    {
      case: "First run, no conversation yet",
      handling:
        "An onboarding empty state with three real questions that send on tap, plus a link to the concept-lookup route.",
    },
    {
      case: "User stops the stream",
      handling:
        "The partial answer is kept, the composer unlocks immediately, and no error is shown (a stop is not a failure).",
    },
    {
      case: "Unknown URL / crashed route",
      handling:
        "`not-found.tsx` and `error.tsx` render designed pages with a route back into the chat.",
    },
    {
      case: "Double-tapping Retry",
      handling:
        "Retry is guarded by a request-in-flight flag and disables itself, so one tap equals one request.",
    },
  ];

export type ErrorCopy = { title: string; hint: string };

/**
 * Turn whatever the transport threw into copy a student can act on.
 *
 * `error.message` here is the response body of the failed request (the route
 * replies with plain, human-readable text on purpose) or a browser network
 * error — never a stack trace, so it is safe to show.
 *
 * `truncated` is passed by the UI when a partially-streamed answer is still on
 * screen. A killed stream surfaces as a generic fetch failure, so without that
 * hint a mid-stream cut gets described as "check your connection" while the user
 * is plainly online and looking at half an answer.
 */
export function describeError(
  error: Error | undefined,
  { truncated = false }: { truncated?: boolean } = {}
): ErrorCopy {
  const raw = (error?.message ?? "").toLowerCase();

  if (truncated) {
    return {
      title: "The answer was cut off",
      hint: "The connection dropped while the answer was streaming. What arrived is kept above — retry to get the rest.",
    };
  }

  if (raw.includes("429") || raw.includes("rate limit")) {
    return {
      title: "Too many requests",
      hint: "The free model allows only a few messages per minute. Wait about 30 seconds, then retry.",
    };
  }

  if (
    raw.includes("401") ||
    raw.includes("403") ||
    raw.includes("unauthorized") ||
    raw.includes("api key")
  ) {
    return {
      title: "The AI service rejected the request",
      hint: "The server's API key is missing, invalid, or out of credit. Retrying will not help until it is fixed.",
    };
  }

  if (
    raw.includes("failed to fetch") ||
    raw.includes("networkerror") ||
    raw.includes("load failed") ||
    raw.includes("network error")
  ) {
    return {
      title: "Could not reach the server",
      hint: "Check your connection. Your message is still here — press Retry when you are back online.",
    };
  }

  if (
    raw.includes("mid-stream") ||
    raw.includes("terminated") ||
    raw.includes("aborted") ||
    raw.includes("stream")
  ) {
    return {
      title: "The answer was cut off",
      hint: "The connection dropped while the answer was streaming. The part that arrived is kept above — Retry to get the rest.",
    };
  }

  if (raw.includes("timeout") || raw.includes("timed out")) {
    return {
      title: "The answer took too long",
      hint: "The model did not respond in time. A shorter question usually goes through.",
    };
  }

  return {
    title: "StudyMate could not answer that",
    hint:
      error?.message?.trim() ||
      "Something went wrong on the way to the model. Your message is still here — press Retry.",
  };
}
