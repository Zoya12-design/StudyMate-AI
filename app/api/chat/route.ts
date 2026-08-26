/**
 * Primary chat route — FE-06 streaming spine, hardened in FE-08.
 *
 * FE-08 adds two things:
 *   1. Input validation, so a malformed or empty payload is rejected with a
 *      readable message instead of blowing up inside `streamText`.
 *   2. An opt-in sabotage switch (`simulate`). It is the "test by deliberately
 *      breaking things" step of the assignment, kept in the shipped route on
 *      purpose so every handled failure state can be demonstrated on the
 *      deployed URL. It is inert unless the client explicitly asks for it, so
 *      the happy path is completely unaffected.
 */

import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  type UIMessage,
} from "ai";

import {
  model,
  SYSTEM_PROMPT,
  TEMPERATURE,
  MAX_OUTPUT_TOKENS,
} from "@/lib/ai-config";
import type { FailureId } from "@/lib/failure-modes";

export const maxDuration = 30;

const MAX_CHARS = 2000;

/**
 * Failures reply with a plain-text body: the AI SDK transport surfaces that body
 * as `error.message`, so the client can show a real reason instead of "[object
 * Object]" or a JSON blob.
 */
function fail(message: string, status: number) {
  return new Response(message, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Forward the first few hundred bytes, then kill the stream — the same thing a
 * dropped mobile connection does. The client keeps the partial text it already
 * rendered and surfaces a retry.
 */
function cutStreamOff(response: Response, afterBytes = 500): Response {
  const upstream = response.body;
  if (!upstream) return response;

  const reader = upstream.getReader();
  let sent = 0;

  const sabotaged = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read();

      if (done) {
        controller.close();
        return;
      }

      controller.enqueue(value);
      sent += value.byteLength;

      if (sent >= afterBytes) {
        await reader.cancel().catch(() => {});
        controller.error(new Error("Connection lost mid-stream (simulated)."));
      }
    },
    cancel() {
      void reader.cancel().catch(() => {});
    },
  });

  return new Response(sabotaged, {
    status: response.status,
    headers: response.headers,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    const messages = (body as { messages?: UIMessage[] } | null)?.messages;
    const simulate = (body as { simulate?: FailureId } | null)?.simulate;

    // ---- edge cases, rejected before the model is ever called -------------

    if (!Array.isArray(messages) || messages.length === 0) {
      return fail("No message was sent. Type a question and try again.", 400);
    }

    const lastText = messages[messages.length - 1]?.parts
      ?.map((part) => (part.type === "text" ? part.text : ""))
      .join("")
      .trim();

    if (!lastText) {
      return fail("That message was empty. Type a question and try again.", 400);
    }

    if (lastText.length > MAX_CHARS) {
      return fail(
        `That message is ${lastText.length} characters. Please shorten it to ${MAX_CHARS} or fewer.`,
        413
      );
    }

    // ---- FE-08 sabotage switch (opt-in, one request at a time) ------------

    if (simulate === "http-500") {
      return fail(
        "The AI service failed before it could start answering. (simulated 500)",
        500
      );
    }

    if (simulate === "rate-limit") {
      return fail(
        "429 rate limit reached — too many requests in a short time. (simulated)",
        429
      );
    }

    if (simulate === "slow") {
      // Long enough to show the skeleton and the "still working" note, short
      // enough to stay well inside the 30s route limit.
      await sleep(6000);
    }

    if (simulate === "empty") {
      // A valid stream that completes without producing any text — the case a
      // naive UI renders as an empty bubble forever.
      const stream = createUIMessageStream<UIMessage>({
        execute: async () => {},
      });

      return createUIMessageStreamResponse({ stream });
    }

    // ---- happy path -------------------------------------------------------

    const result = streamText({
      model,
      system: SYSTEM_PROMPT,
      messages: await convertToModelMessages(messages),
      temperature: TEMPERATURE,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    });

    const response = result.toUIMessageStreamResponse({
      // Surface the real reason (rate limit, bad key, upstream outage) so the
      // error banner can be specific. These are provider messages, not stacks.
      onError: (error) =>
        error instanceof Error
          ? error.message
          : "StudyMate could not answer that.",
    });

    return simulate === "mid-stream" ? cutStreamOff(response) : response;
  } catch (error) {
    console.error("Chat API error:", error);

    return fail(
      "StudyMate could not answer that. Please retry in a moment.",
      500
    );
  }
}
