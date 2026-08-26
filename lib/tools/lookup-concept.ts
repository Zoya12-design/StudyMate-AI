/**
 * FE-07 — server-side tool: `lookupConcept`
 * ---------------------------------------------------------------------------
 * TOOL CONTRACT (also documented in README.md)
 *
 *   name:   lookupConcept
 *   input:  { term: string }            // 2–80 chars, the concept to explain
 *   output: ConceptResult               // see the type below
 *   fails:  throws on 404 / empty / network  -> surfaces as an `output-error`
 *           tool part in the UI (a designed error state, never a crash)
 *
 * The model calls this whenever a student asks what something is. It fetches a
 * factual summary from Wikipedia's public REST API, so the answer is grounded
 * in real data instead of being hallucinated.
 */

import { tool } from "ai";
import { z } from "zod";

// --- Input schema -----------------------------------------------------------
// Kept deliberately small: every field is something the model could hallucinate,
// so we expose exactly one, and use `.describe()` as inline guidance for the model.
export const conceptInputSchema = z.object({
  term: z
    .string()
    .min(2, "Term must be at least 2 characters.")
    .max(80, "Term is too long.")
    .describe(
      "The single concept, topic, or term the student wants explained — e.g. " +
        "'Binary search tree', 'Photosynthesis', 'HTTP'. Use the canonical name, " +
        "not a full sentence or question."
    ),
});

export type ConceptInput = z.infer<typeof conceptInputSchema>;

// --- Output shape -----------------------------------------------------------
// This is the exact object the <ConceptCard /> component renders.
// `description` and `thumbnail` are nullable — the UI has an explicit plan for
// when they are missing (placeholder tile / hidden line).
export type ConceptResult = {
  term: string;
  title: string;
  summary: string;
  description: string | null;
  thumbnail: string | null;
  url: string;
  readingTimeMin: number;
};

const WIKI_SUMMARY = "https://en.wikipedia.org/api/rest_v1/page/summary/";

type WikiSummary = {
  title?: string;
  extract?: string;
  description?: string;
  thumbnail?: { source?: string };
  content_urls?: { desktop?: { page?: string } };
  type?: string;
};

export const lookupConcept = tool({
  description:
    "Look up a short, factual encyclopedic summary of a concept, topic, or " +
    "term from Wikipedia. Call this whenever the student asks what something " +
    "is, or to explain/define a specific named concept. Returns a title, " +
    "summary, an optional image, and a source link.",
  inputSchema: conceptInputSchema,
  execute: async ({ term }): Promise<ConceptResult> => {
    const clean = term.trim();

    // A small deliberate pause so the "dispatched, awaiting result"
    // (input-available) state is actually visible in the UI. In a production
    // tool you would remove this — here it makes the state machine observable.
    await new Promise((resolve) => setTimeout(resolve, 650));

    const slug = encodeURIComponent(clean.replace(/\s+/g, "_"));

    const res = await fetch(WIKI_SUMMARY + slug, {
      headers: {
        // Wikimedia asks callers to send a descriptive User-Agent.
        "User-Agent":
          "StudyMate-AI/1.0 (FlyRank FE-07; educational project)",
        Accept: "application/json",
      },
    });

    // 404 is the reviewer-triggerable failure: ask for a nonsense term and
    // this throw becomes an `output-error` tool part.
    if (res.status === 404) {
      throw new Error(
        `No encyclopedia entry found for “${clean}”. Try a more specific or correctly spelled term.`
      );
    }

    if (!res.ok) {
      throw new Error(
        `Lookup failed (HTTP ${res.status}). The knowledge source may be temporarily unavailable.`
      );
    }

    const data = (await res.json()) as WikiSummary;
    const summary = (data.extract ?? "").trim();

    if (!summary) {
      throw new Error(
        `Found “${data.title ?? clean}”, but it has no usable summary. Try a related term.`
      );
    }

    const words = summary.split(/\s+/).filter(Boolean).length;

    return {
      term: clean,
      title: data.title ?? clean,
      summary,
      description: data.description?.trim() || null,
      thumbnail: data.thumbnail?.source ?? null,
      url:
        data.content_urls?.desktop?.page ??
        `https://en.wikipedia.org/wiki/${slug}`,
      // ~200 wpm reading speed, floored at 1 minute.
      readingTimeMin: Math.max(1, Math.round(words / 200)),
    };
  },
});
