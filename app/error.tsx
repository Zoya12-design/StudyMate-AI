"use client";

/**
 * FE-08 — route-level error boundary.
 *
 * Catches anything thrown while rendering a page or a server component under
 * `app/`. Without this file Next.js shows its own error screen in development
 * and a bare "Application error" in production; with it, a crash is a designed
 * page that still has a way forward.
 */

import Link from "next/link";
import { useEffect } from "react";

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // One deliberate log so the failure is traceable in the Vercel logs.
    console.error("Route error boundary caught:", error);
  }, [error]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#faf9f7] px-5 py-10">
      <div className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-2xl">
          ⚠️
        </div>

        <h1 className="mt-5 text-xl font-bold tracking-tight text-neutral-900">
          This page stopped working
        </h1>

        <p className="mt-2 text-sm leading-6 text-neutral-500">
          Something broke while loading StudyMate AI. Your chat history is kept
          in this browser tab, so trying again usually brings it straight back.
        </p>

        {error?.digest && (
          <p className="mt-3 font-mono text-[11px] text-neutral-400">
            reference: {error.digest}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="h-11 rounded-xl bg-neutral-900 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800 active:bg-neutral-950"
          >
            Try again
          </button>

          <Link
            href="/"
            className="flex h-11 items-center justify-center rounded-xl border border-neutral-200 bg-white px-5 text-sm font-semibold text-neutral-800 shadow-sm transition hover:bg-neutral-50"
          >
            Back to chat
          </Link>
        </div>
      </div>
    </main>
  );
}
