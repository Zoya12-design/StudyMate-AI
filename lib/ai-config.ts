/**
 * AI configuration (FE-06 + FE-07)
 *
 * Model, provider, and system prompt live in one server-side module so
 * switching providers later never touches the chat UI or the API routes.
 */

import { openrouter } from "@openrouter/ai-sdk-provider";

// OpenRouter · Llama 3.3 70B Instruct. Supports tool calling (needed for FE-07).
// Centralised so the model is easy to swap in exactly one place.
export const MODEL_ID = "meta-llama/llama-3.3-70b-instruct";

// Shared model instance. The provider reads OPENROUTER_API_KEY from the
// environment (server-side only) — never import this into a client component.
export const model = openrouter(MODEL_ID);

export const MAX_OUTPUT_TOKENS = 1500;

export const SYSTEM_PROMPT = `You are the AI assistant inside StudyMate AI.
Help students understand difficult topics clearly and practically.
Prefer concise explanations, examples, short steps, and exam-friendly wording.
Ask a brief clarifying question when the student's request is genuinely unclear.
Do not invent facts. Use markdown only when it improves readability.`;

export const TEMPERATURE = 0.5;
