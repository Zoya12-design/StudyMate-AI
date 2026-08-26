/**
 * FE-08 — loading state for an answer that has not started arriving yet.
 *
 * Deliberately not a spinner: this is the assistant bubble's own geometry (same
 * 36px avatar, same padding, same border radius, three rows at the bubble's
 * 28px line-height) so when the first token replaces it, nothing on the page
 * moves. A centred spinner swapped for a three-line paragraph is a guaranteed
 * layout shift.
 */

export default function AssistantSkeleton({ slow }: { slow: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-xs font-bold text-white shadow-sm">
        S
      </div>

      <div className="min-w-0 flex-1">
        <div
          aria-hidden
          className="max-w-[90%] rounded-2xl rounded-bl-md border border-neutral-200 bg-white px-4 py-3 shadow-sm sm:max-w-[82%]"
        >
          {/* Row heights match the message bubble's leading-7 exactly. */}
          {[100, 92, 64].map((width, index) => (
            <div key={width} className="flex h-7 items-center">
              <div
                className="fe08-skeleton h-[15px] rounded-md"
                style={{
                  width: `${width}%`,
                  animationDelay: `${index * 0.12}s`,
                }}
              />
            </div>
          ))}
        </div>

        {/* A stall needs an explanation, otherwise it reads as a frozen page. */}
        {slow && (
          <p className="mt-2 text-xs text-neutral-500">
            Still working — the free model can take a few seconds on the first
            token. You can press Stop at any time.
          </p>
        )}

        <p aria-live="polite" className="sr-only">
          StudyMate is writing a reply.
        </p>
      </div>
    </div>
  );
}
