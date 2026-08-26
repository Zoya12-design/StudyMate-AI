"use client";

/**
 * FE-08 — the designed failure state for the chat.
 *
 * Sits between the transcript and the composer so it reads as "this turn
 * failed", not "the app is broken". Two rules it exists to enforce:
 *   - the copy names the cause and what to do about it (see `describeError`)
 *   - Retry is a single-flight action: it disables itself while a retry is in
 *     flight, so a double tap on mobile cannot fire two requests.
 */

import type { ErrorCopy } from "@/lib/failure-modes";

export default function ErrorBanner({
  copy,
  retrying,
  onRetry,
  onDismiss,
}: {
  copy: ErrorCopy;
  retrying: boolean;
  onRetry: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      role="alert"
      className="shrink-0 border-t border-amber-200 bg-amber-50 px-3 py-3 sm:px-6"
    >
      <div className="mx-auto flex w-full max-w-3xl items-start gap-3">
        <span aria-hidden className="mt-0.5 text-base leading-none">
          ⚠️
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-amber-900">{copy.title}</p>

          <p className="mt-0.5 text-xs leading-5 text-amber-800">{copy.hint}</p>

          <div className="mt-2.5 flex items-center gap-2">
            <button
              type="button"
              onClick={onRetry}
              disabled={retrying}
              className="h-9 rounded-xl bg-amber-600 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-700 active:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {retrying ? "Retrying…" : "Retry this message"}
            </button>

            <button
              type="button"
              onClick={onDismiss}
              className="h-9 rounded-xl px-3 text-xs font-semibold text-amber-800 transition hover:bg-amber-100"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
