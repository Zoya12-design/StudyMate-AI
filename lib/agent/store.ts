/**
 * FL-07 — Checkpoint agent: the checklist store.
 * ---------------------------------------------------------------------------
 * This is the agent's one real data connection: a JSON file on disk that the
 * agent reads and writes through tools. No database, no account, no signup —
 * which is exactly what the FL-06 access plan promised.
 *
 * Where the file lives:
 *   local dev  ->  <project>/data/assignments.json   (persists, goes to git)
 *   on Vercel  ->  /tmp/checkpoint/assignments.json  (EPHEMERAL — see BUILD-LOG)
 *
 * Vercel's filesystem is read-only apart from /tmp, and /tmp is wiped between
 * cold starts. That limitation is documented in BUILD-LOG.md rather than hidden:
 * the honest MVP boundary is "persistent locally, session-only when deployed".
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type ChecklistItem = {
  /** 1-based, stable within an assignment — what `markItems` refers to. */
  id: number;
  /** What I have to hand in, in plain words. */
  text: string;
  /** The words from the brief this came from. Makes an invented item obvious. */
  source: string;
  /** true = deliverable or pass criterion. false = a tip or suggestion. */
  required: boolean;
  done: boolean;
};

export type Assignment = {
  code: string;
  title: string;
  items: ChecklistItem[];
  createdAt: string;
  updatedAt: string;
};

type StoreFile = {
  version: 1;
  assignments: Record<string, Assignment>;
};

const EMPTY: StoreFile = { version: 1, assignments: {} };

function dataDir(): string {
  return process.env.VERCEL
    ? path.join("/tmp", "checkpoint")
    : path.join(process.cwd(), "data");
}

function storePath(): string {
  return path.join(dataDir(), "assignments.json");
}

/** Assignment codes are the store's keys, so normalise them once, here. */
export function normaliseCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "-");
}

export async function readStore(): Promise<StoreFile> {
  try {
    const raw = await readFile(storePath(), "utf8");
    const parsed = JSON.parse(raw) as StoreFile;
    // A hand-edited or half-written file must not take the agent down.
    if (!parsed || typeof parsed !== "object" || !parsed.assignments) {
      return { ...EMPTY };
    }
    return parsed;
  } catch {
    // Missing file is the normal first-run case, not an error.
    return { ...EMPTY };
  }
}

async function writeStore(store: StoreFile): Promise<void> {
  await mkdir(dataDir(), { recursive: true });
  await writeFile(storePath(), JSON.stringify(store, null, 2), "utf8");
}

export async function getAssignment(
  code: string
): Promise<Assignment | undefined> {
  const store = await readStore();
  return store.assignments[normaliseCode(code)];
}

export async function listAssignments(): Promise<Assignment[]> {
  const store = await readStore();
  return Object.values(store.assignments).sort((a, b) =>
    a.code.localeCompare(b.code)
  );
}

export async function putAssignment(assignment: Assignment): Promise<void> {
  const store = await readStore();
  store.assignments[assignment.code] = assignment;
  await writeStore(store);
}

/** Where the file actually is — the agent tells me, so I can go look at it. */
export function storeLocation(): string {
  return storePath();
}
