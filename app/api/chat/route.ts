import {
  convertToModelMessages,
  streamText,
  type UIMessage,
} from "ai";

import {
  model,
  SYSTEM_PROMPT,
  TEMPERATURE,
  MAX_OUTPUT_TOKENS,
} from "@/lib/ai-config";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json();

    const result = streamText({
      model,
      system: SYSTEM_PROMPT,
      messages: await convertToModelMessages(messages),
      temperature: TEMPERATURE,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);

    return Response.json(
      {
        error: "Failed to generate AI response.",
      },
      {
        status: 500,
      }
    );
  }
}