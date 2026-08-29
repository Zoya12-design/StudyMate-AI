"use client";

/**
 * FE-07 — the tool RESULT rendered as a real component (not a JSON dump).
 * Shown for the `output-available` state. Handles missing optional fields:
 *   - no thumbnail  -> a lettered placeholder tile
 *   - no description -> the descriptor line is omitted
 */

import type { ConceptResult } from "@/lib/tools/lookup-concept";

export default function ConceptCard({ data }: { data: ConceptResult }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
      {/* Accent header — marks this as a grounded concept result */}
      <div className="flex items-center gap-2 border-b border-emerald-100 bg-emerald-50 px-4 py-2">
        <span aria-hidden className="text-sm">
          📖
        </span>
        <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
          Concept
        </span>
        <span className="ml-auto text-[11px] font-medium text-emerald-600">
          from Wikipedia
        </span>
      </div>

      <div className="flex gap-4 p-4">
        {/* Thumbnail, or a lettered placeholder when the article has no image */}
        {data.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.thumbnail}
            alt={data.title}
            className="h-20 w-20 shrink-0 rounded-xl border border-neutral-200 object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-900 text-2xl font-bold text-white">
            {data.title.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-neutral-900">
            {data.title}
          </h3>

          {/* Descriptor line only renders when present */}
          {data.description && (
            <p className="mt-0.5 truncate text-xs font-medium uppercase tracking-wide text-neutral-400">
              {data.description}
            </p>
          )}

          <p className="mt-2 line-clamp-4 text-sm leading-6 text-neutral-700">
            {data.summary}
          </p>
        </div>
      </div>

      {/* Footer: source + reading time + link out */}
      <div className="flex items-center justify-between border-t border-neutral-100 px-4 py-2.5">
        <span className="text-[11px] text-neutral-400">
          ~{data.readingTimeMin} min read
        </span>

        <a
          href={data.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-neutral-800"
        >
          Read full article
          <span aria-hidden>↗</span>
        </a>
      </div>
    </article>
  );
}
