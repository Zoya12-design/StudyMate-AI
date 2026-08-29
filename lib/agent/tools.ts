/**
 * FL-07 — Checkpoint agent: the tools.
 * ---------------------------------------------------------------------------
 * Four tools, matching the FL-06 spec:
 *
 *   getChecklist      read-only   — what did I save for this assignment?
 *   saveChecklist     WRITE       — store a checklist; overwrite needs a yes
 *   markItems         write       — flip done flags (reversible, no confirm)
 *   listProjectFiles  read-only   — does the file I claim to have made exist?
 *
 * The guardrail that matters lives in `saveChecklist`: creating a new checklist
 * is harmless, but replacing an existing one destroys my only record. So the
 * tool itself refuses to overwrite unless `confirmedOverwrite` is true, and
 * returns a diff for me to look at first. The rule is enforced in code, not
 * only asked for in the prompt — a prompt rule is a request, a code check is a
 * guarantee.
 */

import { tool } from "ai";
import { z } from "zod";
import {
  getAssignment,
  listAssignments,
  normaliseCode,
  putAssignment,
  storeLocation,
  type ChecklistItem,
} from "@/lib/agent/store";
import { readdir } from "node:fs/promises";
import path from "node:path";

// ---------------------------------------------------------------------------
// getChecklist
// ---------------------------------------------------------------------------

export const getChecklist = tool({
  description:
    "Read a saved assignment checklist back from disk. Pass the assignment " +
    "code (e.g. 'FE-08') to get one, or omit it to list every assignment " +
    "saved so far. Call this BEFORE answering any question about what is " +
    "left, what is done, or what was already saved — never guess from memory.",
  inputSchema: z.object({
    code: z
      .string()
      .optional()
      .describe(
        "Assignment code such as 'FE-08' or 'FL-07'. Omit to list all saved assignments."
      ),
  }),
  execute: async ({ code }) => {
    if (!code) {
      const all = await listAssignments();
      return {
        kind: "list" as const,
        count: all.length,
        assignments: all.map((a) => ({
          code: a.code,
          title: a.title,
          done: a.items.filter((i) => i.done).length,
          total: a.items.length,
          updatedAt: a.updatedAt,
        })),
      };
    }

    const found = await getAssignment(code);

    if (!found) {
      return {
        kind: "missing" as const,
        code: normaliseCode(code),
        message:
          "Nothing saved for this code yet. Ask her to paste the brief so a checklist can be built.",
      };
    }

    const remaining = found.items.filter((i) => i.required && !i.done);

    return {
      kind: "found" as const,
      code: found.code,
      title: found.title,
      items: found.items,
      requiredRemaining: remaining.length,
      updatedAt: found.updatedAt,
    };
  },
});

// ---------------------------------------------------------------------------
// saveChecklist  — the guarded write
// ---------------------------------------------------------------------------

const itemInput = z.object({
  text: z.string().min(3).describe("What she has to hand in, in plain words."),
  source: z
    .string()
    .min(3)
    .describe(
      "The words from the brief this item came from, quoted. Required — if you " +
        "cannot quote it, the item does not belong on the list."
    ),
  required: z
    .boolean()
    .describe(
      "true for a deliverable or a pass/evaluation criterion, false for a tip or suggestion."
    ),
});

export const saveChecklist = tool({
  description:
    "Save a checklist for an assignment. Use this once you have read a brief " +
    "and turned it into items. If a checklist already exists for this code, " +
    "this tool will REFUSE and return a diff instead of overwriting — show " +
    "her that diff, wait for a clear yes, then call again with " +
    "confirmedOverwrite: true.",
  inputSchema: z.object({
    code: z
      .string()
      .min(2)
      .describe("Assignment code from the brief, e.g. 'FE-08', 'FL-07'."),
    title: z.string().min(2).describe("The assignment's title."),
    items: z
      .array(itemInput)
      .min(1)
      .describe("Every requirement found in the brief, in the brief's order."),
    confirmedOverwrite: z
      .boolean()
      .optional()
      .describe(
        "Only set true after she has seen the diff and said yes. Never set it on the first attempt."
      ),
  }),
  execute: async ({ code, title, items, confirmedOverwrite }) => {
    const key = normaliseCode(code);
    const existing = await getAssignment(key);

    // The guardrail: an overwrite is the irreversible action, so it needs a yes.
    if (existing && !confirmedOverwrite) {
      return {
        kind: "needs-confirmation" as const,
        code: key,
        message:
          "A checklist already exists for this code. Show her this comparison and ask for a yes before overwriting.",
        current: {
          title: existing.title,
          itemCount: existing.items.length,
          doneCount: existing.items.filter((i) => i.done).length,
          items: existing.items.map((i) => i.text),
          updatedAt: existing.updatedAt,
        },
        proposed: {
          title,
          itemCount: items.length,
          items: items.map((i) => i.text),
        },
        warning:
          existing.items.some((i) => i.done)
            ? "The saved version has items already ticked off. Overwriting loses that progress."
            : "The saved version has no ticked items, so nothing is lost except the wording.",
      };
    }

    const now = new Date().toISOString();

    const built: ChecklistItem[] = items.map((item, index) => ({
      id: index + 1,
      text: item.text,
      source: item.source,
      required: item.required,
      done: false,
    }));

    await putAssignment({
      code: key,
      title,
      items: built,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });

    return {
      kind: "saved" as const,
      code: key,
      title,
      overwrote: Boolean(existing),
      required: built.filter((i) => i.required).length,
      optional: built.filter((i) => !i.required).length,
      savedTo: storeLocation(),
    };
  },
});

// ---------------------------------------------------------------------------
// markItems  — reversible, so no confirmation gate
// ---------------------------------------------------------------------------

export const markItems = tool({
  description:
    "Tick items off (or un-tick them) on a saved checklist, by item id. Only " +
    "call this once you have actually seen evidence the item is done — her " +
    "saying 'done' is not evidence on its own if it is a file you can check " +
    "with listProjectFiles.",
  inputSchema: z.object({
    code: z.string().min(2).describe("Assignment code, e.g. 'FE-08'."),
    itemIds: z
      .array(z.number().int().positive())
      .min(1)
      .describe("The item ids to change, as shown by getChecklist."),
    done: z.boolean().describe("true to tick off, false to un-tick."),
  }),
  execute: async ({ code, itemIds, done }) => {
    const existing = await getAssignment(code);

    if (!existing) {
      return {
        kind: "missing" as const,
        code: normaliseCode(code),
        message: "No checklist saved for this code, so there is nothing to mark.",
      };
    }

    const wanted = new Set(itemIds);
    const changed: number[] = [];
    const unknown = itemIds.filter(
      (id) => !existing.items.some((i) => i.id === id)
    );

    const items = existing.items.map((item) => {
      if (!wanted.has(item.id) || item.done === done) return item;
      changed.push(item.id);
      return { ...item, done };
    });

    if (changed.length > 0) {
      await putAssignment({
        ...existing,
        items,
        updatedAt: new Date().toISOString(),
      });
    }

    return {
      kind: "marked" as const,
      code: existing.code,
      changed,
      unknownIds: unknown,
      requiredRemaining: items.filter((i) => i.required && !i.done).length,
      remaining: items.filter((i) => i.required && !i.done).map((i) => i.text),
    };
  },
});

// ---------------------------------------------------------------------------
// listProjectFiles  — the "don't just believe me" tool
// ---------------------------------------------------------------------------

// Allowlist from the FL-06 spec. Anything outside this is refused, so the agent
// can never be talked into wandering the filesystem. The project root was added
// after the first test run: BUILD-LOG.md and README.md live there, and without
// the root the agent could never check a claim about either. `.env.local` also
// lives there — so nothing beginning with a dot is ever listed, anywhere.
const ALLOWED_ROOTS = ["app", "components", "lib", "data"] as const;

export const listProjectFiles = tool({
  description:
    "List the files and folders inside one folder of her project, to check " +
    "whether something she says she built actually exists. Call this whenever " +
    "she claims a page, route, component, or file is done. Pass '.' for the " +
    "project root (where BUILD-LOG.md and README.md live). Otherwise only " +
    "app/, components/, lib/ and data/ can be read.",
  inputSchema: z.object({
    folder: z
      .string()
      .describe(
        "Project-relative folder, e.g. '.', 'app', 'app/week-06', 'components/chat'. " +
          "Must be '.' or start with app, components, lib, or data."
      ),
  }),
  execute: async ({ folder }) => {
    const cleaned = folder.trim().replace(/^[./\\]+/, "").replace(/\\/g, "/");
    const root = cleaned.split("/")[0];
    const isProjectRoot = cleaned === "";

    if (
      !isProjectRoot &&
      !ALLOWED_ROOTS.includes(root as (typeof ALLOWED_ROOTS)[number])
    ) {
      return {
        kind: "refused" as const,
        folder: cleaned,
        message: `Only the project root and ${ALLOWED_ROOTS.join(", ")} can be read. Tell her that folder is outside what you are allowed to look at.`,
      };
    }

    const target = path.join(process.cwd(), cleaned);

    // Belt and braces: even after the allowlist, refuse anything that escaped
    // the project root via "..".
    if (!target.startsWith(process.cwd())) {
      return {
        kind: "refused" as const,
        folder: cleaned,
        message: "That path leaves the project folder.",
      };
    }

    try {
      const entries = await readdir(target, { withFileTypes: true });

      // The one filter that makes the root safe to list. Applied to every
      // folder, not just the root, because a rule with an exception is a rule
      // I have to remember; this one I don't.
      const visible = entries.filter((e) => !e.name.startsWith("."));

      return {
        kind: "listed" as const,
        folder: cleaned || ".",
        files: visible.filter((e) => e.isFile()).map((e) => e.name),
        folders: visible.filter((e) => e.isDirectory()).map((e) => e.name),
      };
    } catch {
      return {
        kind: "not-found" as const,
        folder: cleaned || ".",
        message: `There is no '${cleaned}' folder in the project. If she said it was done, it is not — say so plainly.`,
      };
    }
  },
});

export const checkpointTools = {
  getChecklist,
  saveChecklist,
  markItems,
  listProjectFiles,
};
