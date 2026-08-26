"use client";

/**
 * FE-08 — the Failure Lab.
 *
 * The assignment asks for the failure states to be tested by deliberately
 * breaking things. Doing that with DevTools is not reproducible for a reviewer,
 * so the sabotage is a first-class control instead: arm a failure, send a
 * message, watch the handled state. Mounted only on /week-06 — the chat at `/`
 * never shows it.
 *
 * A simulation is one-shot on purpose. It applies to the next message and then
 * disarms itself, which is also what makes Retry meaningful: the retry runs for
 * real and succeeds.
 */

import { FAILURE_MODES, type FailureId } from "@/lib/failure-modes";

export default function FailureLab({
  armed,
  onArm,
  forcedOffline,
  onToggleOffline,
}: {
  armed: FailureId | null;
  onArm: (id: FailureId | null) => void;
  forcedOffline: boolean;
  onToggleOffline: (next: boolean) => void;
}) {
  const armedMode = FAILURE_MODES.find((mode) => mode.id === armed);

  return (
    <div className="shrink-0 border-b border-neutral-200 bg-white px-3 py-3 sm:px-6">
      <details className="mx-auto w-full max-w-3xl" open>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Failure lab
          </span>

          <span className="text-[11px] text-neutral-400">
            break it on purpose
          </span>
        </summary>

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {FAILURE_MODES.map((mode) => {
            const isOffline = mode.id === "offline";

            const active = isOffline ? forcedOffline : armed === mode.id;

            return (
              <button
                key={mode.id}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  if (isOffline) {
                    onToggleOffline(!forcedOffline);
                    return;
                  }

                  onArm(armed === mode.id ? null : mode.id);
                }}
                className={[
                  "rounded-xl border p-2.5 text-left transition",
                  active
                    ? "border-neutral-900 bg-neutral-900 text-white shadow-sm"
                    : "border-neutral-200 bg-white text-neutral-800 hover:border-neutral-300 hover:bg-neutral-50",
                ].join(" ")}
              >
                <div className="flex items-center gap-2">
                  <span aria-hidden className="text-sm">
                    {mode.icon}
                  </span>

                  <span className="text-xs font-semibold">{mode.label}</span>
                </div>

                <p
                  className={[
                    "mt-1 text-[11px] leading-4",
                    active ? "text-neutral-300" : "text-neutral-500",
                  ].join(" ")}
                >
                  {isOffline
                    ? forcedOffline
                      ? "Offline — tap to reconnect"
                      : "Locks the composer, keeps your text"
                    : mode.cause}
                </p>
              </button>
            );
          })}
        </div>

        <p className="mt-3 text-[11px] leading-4 text-neutral-500">
          {armedMode ? (
            <>
              <span className="font-semibold text-neutral-900">
                Armed: {armedMode.label}.
              </span>{" "}
              Send any message to trigger it once. Expected result:{" "}
              {armedMode.handling}
            </>
          ) : forcedOffline ? (
            <span className="font-semibold text-neutral-900">
              Offline mode is on — the composer is locked until you turn it off.
            </span>
          ) : (
            <>
              Nothing armed — messages behave normally. Pick a failure, then send
              a message; it disarms itself afterwards so Retry runs for real.
            </>
          )}
        </p>
      </details>
    </div>
  );
}
