/**
 * FE-06 AI configuration
 *
 * Keep model selection and the system prompt in one server-side module.
 * Changing the provider later should not require rewriting the chat UI.
 */

// Gemini 2.5 Flash has a current free tier in Google AI Studio.
// The model string is centralized so it is easy to change later.
export const MODEL_ID = "gemini-3.6-flash";

export const MAX_OUTPUT_TOKENS = 1500;

export const SYSTEM_PROMPT = `You are the AI assistant inside StudyMate AI.
Help students understand difficult topics clearly and practically.
Prefer concise explanations, examples, short steps, and exam-friendly wording.
Ask a brief clarifying question when the student's request is genuinely unclear.
Do not invent facts. Use markdown only when it improves readability.`;

export const TEMPERATURE = 0.5;
