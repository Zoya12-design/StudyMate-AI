/**
 * FE-07 — tool-enabled chat route.
 *
 * Same streaming spine as FE-06's /api/chat, plus:
 *   - a `tools` map containing the server-side `lookupConcept` tool
 *   - `stopWhen: stepCountIs(5)` so the model can call the tool, read the
 *     result, then write a short explanation (multi-step)
 *   - `onError` forwards real error messages so the designed error state can
 *     show a reason instead of a generic string.
 */

import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { google } from "@ai-sdk/google";

import { MODEL_ID } from "@/lib/ai-config";
import { lookupConcept } from "@/lib/tools/lookup-concept";

export const maxDuration = 30;

const SYSTEM_PROMPT = `You are StudyMate AI's concept explainer.

When a student asks what something is, or to explain or define a specific named
concept, topic, or term, you MUST call the lookupConcept tool first to fetch a
factual summary. Pass the canonical term (e.g. "Binary search tree"), not the
student's whole sentence.

After the tool returns, add just one or two sentences in plain, student-friendly
language. Do NOT repeat the full summary — the student already sees the concept
card. If the lookup fails, briefly suggest a corrected or more specific term.

For greetings, thanks, or anything that is not a concept lookup, reply normally
and do not call the tool. Never invent encyclopedic facts.`;

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json();

    const result = streamText({
      model: google(MODEL_ID),
      system: SYSTEM_PROMPT,
      messages: await convertToModelMessages(messages),
      tools: { lookupConcept },
      stopWhen: stepCountIs(5),
      temperature: 0.3,
    });

    return result.toUIMessageStreamResponse({
      // Forward tool/stream error text to the client. The messages here are
      // safe, human-readable strings thrown by the tool (e.g. "No entry found").
      onError: (error) =>
        error instanceof Error ? error.message : "Something went wrong.",
    });
  } catch (error) {
    console.error("week-05 tool route error:", error);
    return Response.json(
      { error: "Failed to generate a response." },
      { status: 500 }
    );
  }
}
