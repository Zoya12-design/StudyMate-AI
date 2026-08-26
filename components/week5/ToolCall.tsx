"use client";

/**
 * FE-07 — the tool-call STATE MACHINE.
 *
 * A single tool part moves through four states. Each gets a distinct visual
 * treatment because each answers a different question:
 *
 *   input-streaming   → "What is it doing?"      (model is forming the call)
 *   input-available   → "With what input?"       (dispatched, awaiting result)
 *   output-available  → "What came back?"        (the ConceptCard)
 *   output-error      → "What went wrong?"       (a designed error card)
 *
 * The outer shell stays a fixed shape and the inner body is keyed by state, so
 * moving between states MORPHS (200ms fade+rise) instead of jumping the layout.
 */

import type { ConceptToolPart } from "@/lib/week5-types";
import ConceptCard from "./ConceptCard";

type State = ConceptToolPart["state"];

// The state union is wider than the four we render (it also carries the
// approval/denied states used by human-in-the-loop tools, which this tool
// never enters). Map any terminal state to the last step.
function stepFor(state: State): number {
  if (state === "input-streaming") return 0;
  if (state === "input-available") return 1;
  return 2;
}

export default function ToolCall({ part }: { part: ConceptToolPart }) {
  const state = part.state;
  const isError = state === "output-error";

  // `input` is a partial object while streaming — read `term` defensively.
  const term =
    part.input && typeof part.input.term === "string" ? part.input.term : "";

  return (
    <div className="w-full max-w-md overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50/70">
      {/* ---- state machine header: stepper + raw state pill --------------- */}
      <div className="flex items-center gap-3 border-b border-neutral-200 bg-white px-3 py-2">
        <Stepper active={stepFor(state)} isError={isError} />
        <code
          className={[
            "ml-auto rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold",
            isError
              ? "bg-red-100 text-red-700"
              : state === "output-available"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-neutral-100 text-neutral-500",
          ].join(" ")}
        >
          {state}
        </code>
      </div>

      {/* ---- morphing body: one block per state -------------------------- */}
      <div className="relative p-3">
        {/* `key` forces a remount on state change so the fade-in replays. */}
        <div key={state} className="fe07-tool-in">
          {state === "input-streaming" && <StreamingBody term={term} />}
          {state === "input-available" && <DispatchedBody term={term} />}
          {state === "output-available" && <ConceptCard data={part.output} />}
          {state === "output-error" && (
            <ErrorBody term={term} detail={part.errorText} />
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* State 0 — input-streaming: the model is still forming the tool call.       */
/* Question answered: "what is it doing?"                                     */
/* -------------------------------------------------------------------------- */
function StreamingBody({ term }: { term: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-sm font-medium text-neutral-500">
        <span className="fe07-pulse text-base" aria-hidden>
          ✨
        </span>
        Deciding what to look up
        <span className="fe07-blink">▍</span>
      </div>

      {/* Shimmer skeleton — no real content yet */}
      <div className="mt-3 space-y-2">
        <Shimmer className="h-3 w-3/4" />
        <Shimmer className="h-3 w-1/2" />
      </div>

      {term && (
        <p className="mt-3 text-xs text-neutral-400">
          forming query: <span className="text-neutral-600">“{term}”</span>
        </p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* State 1 — input-available: call dispatched, awaiting the result.           */
/* Question answered: "with what input?"                                      */
/* -------------------------------------------------------------------------- */
function DispatchedBody({ term }: { term: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-sm font-medium text-neutral-700">
        <span className="text-base" aria-hidden>
          🔍
        </span>
        Looking up a concept
      </div>

      {/* The exact, confirmed input the tool was called with */}
      <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-1.5">
        <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">
          term
        </span>
        <span className="text-sm font-semibold text-neutral-900">
          {term || "…"}
        </span>
      </div>

      {/* Indeterminate progress — result is on its way */}
      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-neutral-200">
        <div className="fe07-indeterminate h-full w-1/3 rounded-full bg-neutral-800" />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* State 3 — output-error: the tool threw. A DESIGNED failure, not a crash.   */
/* Question answered: "what went wrong?"                                      */
/* -------------------------------------------------------------------------- */
function ErrorBody({ term, detail }: { term: string; detail?: string }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-red-800">
        <span className="text-base" aria-hidden>
          ⚠️
        </span>
        Couldn’t find that concept
      </div>

      <p className="mt-1.5 text-sm text-red-700">
        {term ? (
          <>
            No result for <span className="font-semibold">“{term}”</span>.
          </>
        ) : (
          <>The lookup didn’t return anything.</>
        )}{" "}
        Try a more specific or correctly spelled term.
      </p>

      {/* The real error message, shown as a muted technical detail */}
      {detail && (
        <p className="mt-2 border-t border-red-200 pt-2 font-mono text-[11px] leading-relaxed text-red-500">
          {detail}
        </p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Small building blocks                                                      */
/* -------------------------------------------------------------------------- */
function Shimmer({ className = "" }: { className?: string }) {
  return (
    <div
      className={`fe07-shimmer overflow-hidden rounded bg-neutral-200 ${className}`}
    />
  );
}

function Stepper({ active, isError }: { active: number; isError: boolean }) {
  const labels = ["stream", "input", isError ? "error" : "result"];

  return (
    <div className="flex items-center gap-1.5">
      {labels.map((label, i) => {
        const done = i < active;
        const current = i === active;
        const terminalError = isError && i === 2;

        return (
          <div key={label} className="flex items-center gap-1.5">
            <span
              className={[
                "h-2 w-2 rounded-full transition-colors duration-300",
                terminalError
                  ? "bg-red-500"
                  : done || current
                    ? current && i === 2
                      ? "bg-emerald-500"
                      : "bg-neutral-800"
                    : "bg-neutral-300",
                current && !terminalError && i !== 2 ? "fe07-pulse" : "",
              ].join(" ")}
            />
            <span
              className={[
                "text-[10px] font-medium",
                current
                  ? terminalError
                    ? "text-red-600"
                    : "text-neutral-700"
                  : "text-neutral-400",
              ].join(" ")}
            >
              {label}
            </span>
            {i < labels.length - 1 && (
              <span className="mx-0.5 h-px w-3 bg-neutral-200" />
            )}
          </div>
        );
      })}
    </div>
  );
}
