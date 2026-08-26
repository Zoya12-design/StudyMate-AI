/**
 * FE-08 — designed 404.
 *
 * A mistyped or stale URL is one of the cheapest edge cases to get wrong. This
 * turns it into an empty state that points at the three routes that do exist.
 */

import Link from "next/link";

const ROUTES = [
  {
    href: "/",
    title: "Chat",
    description: "Ask StudyMate anything and watch the answer stream in.",
  },
  {
    href: "/week-05",
    title: "Concept lookup",
    description: "Tool-calling demo — looks a term up, then explains it.",
  },
  {
    href: "/week-06",
    title: "Reliability lab",
    description: "Trigger each handled failure state on purpose.",
  },
];

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#faf9f7] px-5 py-10">
      <div className="w-full max-w-md">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-900 text-xl font-bold text-white shadow-sm">
            404
          </div>

          <h1 className="mt-5 text-xl font-bold tracking-tight text-neutral-900">
            That page does not exist
          </h1>

          <p className="mt-2 text-sm leading-6 text-neutral-500">
            The link may be old or mistyped. Here is everything StudyMate AI can
            do right now.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          {ROUTES.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className="group rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-md"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-neutral-900">
                  {route.title}
                </span>

                <span className="text-neutral-400 transition group-hover:translate-x-0.5 group-hover:text-neutral-600">
                  →
                </span>
              </div>

              <p className="mt-1 text-xs leading-5 text-neutral-500">
                {route.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
