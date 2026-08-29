/**
 * FE-07 — shared, fully-typed UI message plumbing.
 *
 * `import type` + `typeof` means the tool's server-only runtime (fetch, zod)
 * is NOT bundled into the client — only its types cross the boundary.
 */

import type { InferUITools, UIMessage } from "ai";
import type { lookupConcept } from "@/lib/tools/lookup-concept";

// The tool set exposed to the model on /api/week-05.
type Week5ToolSet = {
  lookupConcept: typeof lookupConcept;
};

// Maps the tool set to typed UI tool parts (input + output types per tool).
export type Week5Tools = InferUITools<Week5ToolSet>;

// A message whose `parts` include text AND a typed `tool-lookupConcept` part.
export type Week5UIMessage = UIMessage<never, never, Week5Tools>;

// The single tool part, narrowed — used to type the <ToolCall /> prop.
export type ConceptToolPart = Extract<
  Week5UIMessage["parts"][number],
  { type: "tool-lookupConcept" }
>;
