/**
 * FL-07 — Checkpoint agent route.
 *
 * Same streaming spine as /api/chat and /api/week-05, with the four Checkpoint
 * tools attached. `stepCountIs(8)` because a real turn can be several steps:
 * read the saved checklist -> check a folder on disk -> tick items off -> write
 * the answer. Five was not enough once listProjectFiles existed (see BUILD-LOG).
 */

import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { model } from "@/lib/ai-config";
import { CHECKPOINT_PROMPT } from "@/lib/agent/prompt";
import { checkpointTools } from "@/lib/agent/tools";

export const maxDuration = 60;

/** A pasted brief is long, so the cap is higher here than on the chat route. */
const MAX_CHARS = 20000;

function fail(message: string, status: number) {
  return new Response(message, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return fail("No message was sent. Type something and try again.", 400);
    }

    const last = messages[messages.length - 1];
    const text = (last?.parts ?? [])
      .map((part) => (part.type === "text" ? part.text : ""))
      .join("")
      .trim();

    if (!text) {
      return fail("That message was empty. Paste a brief or ask a question.", 400);
    }

    if (text.length > MAX_CHARS) {
      return fail(
        `That message is ${text.length} characters. Please shorten it to ${MAX_CHARS} or fewer.`,
        413
      );
    }

    const result = streamText({
      model,
      system: CHECKPOINT_PROMPT,
      messages: await convertToModelMessages(messages),
      tools: checkpointTools,
      stopWhen: stepCountIs(8),
      // Low temperature on purpose: this agent quotes a brief and lists
      // requirements. Invention is the failure mode, not dullness.
      temperature: 0.2,
    });

    return result.toUIMessageStreamResponse({
      onError: (error) =>
        error instanceof Error
          ? error.message
          : "Checkpoint could not finish that. Please retry.",
    });
  } catch (error) {
    console.error("agent route error:", error);
    return fail("Checkpoint could not finish that. Please retry.", 500);
  }
}
