# FE-06 — StudyMate AI Streaming Chat

A mobile-friendly streaming AI chat for the StudyMate AI capstone, built with Next.js + Vercel AI SDK + OpenRouter (Llama 3.3 70B).

FlyRank explicitly allows interns to use another provider when Claude access is unavailable. This version uses OpenRouter (routing to Meta's Llama 3.3 70B Instruct) so the project can be completed without a paid Claude account.

## Structure

```text
app/
  api/chat/route.ts       # server: streamText -> OpenRouter -> UI message stream
  page.tsx                 # renders the chat
  layout.tsx
  globals.css
components/
  ChatInterface.tsx       # useChat, streaming parts, stop, scroll-aware UI
lib/
  ai-config.ts             # model + system prompt + generation settings
```

## Local setup

1. Install Node.js 18+.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local`.
4. Create an OpenRouter API key at https://openrouter.ai/keys and put it in `.env.local` as `OPENROUTER_API_KEY`.
5. Run `npm run dev`.
6. Open `http://localhost:3000`.

Never put the API key in client-side code or commit `.env.local`.

## FE-06 evaluation checklist

- **Visible streaming:** `streamText()` returns a UI message stream and `useChat` renders `message.parts` as they arrive.
- **Stop mid-stream:** the Stop button calls `stop()`, the partial assistant response remains in chat state, and the composer becomes usable again.
- **Multiple turns:** `useChat` maintains the conversation's `messages[]` and sends the history to `/api/chat` on each turn.
- **Server-side key:** only the server route uses the OpenRouter provider; the browser never receives the API key.
- **Phone width:** the chat uses a single-column mobile-first layout and a 16px textarea to avoid mobile browser zoom.
- **Scroll robustness:** auto-scroll stays pinned only while the user is near the bottom. Scrolling upward releases the pin and shows a “Jump to latest” control.
- **Thinking handoff:** a submitted-state typing indicator appears before the first streamed text arrives.
- **Streaming-safe text:** messages are rendered as text rather than raw HTML, so incomplete markdown cannot break the UI while tokens are arriving.

## Deploy to Vercel

1. Push this project to GitHub.
2. Import the repository into Vercel.
3. Add `OPENROUTER_API_KEY` in Vercel Project Settings → Environment Variables.
4. Deploy.
5. Open the generated deployment URL and test a conversation.
6. Submit the deployment URL plus GitHub links to:
   - `app/api/chat/route.ts`
   - `components/ChatInterface.tsx`

## Before submitting

Test these exact reviewer actions:

1. Send a question and watch the response arrive incrementally.
2. Press Stop while the answer is still generating.
3. Confirm the partial answer remains visible.
4. Send another message after stopping.
5. Send 3–4 messages and confirm previous turns remain visible.
6. Scroll upward while a long response is streaming. Confirm the page does not yank you back to the bottom.
7. Press “Jump to latest” and confirm it returns to the newest token.
8. Test the layout at phone width in browser DevTools.

---

# FE-07 — Tool Results & Structured Output

FE-07 is built **additively** on top of FE-06: the root chat (`/`, `/api/chat`) is untouched, and the tool demo lives on its own route so both weeks can be graded independently.

- **UI route:** `/week-05` (`app/week-05/page.tsx` → `components/week5/ConceptChat.tsx`)
- **API route:** `/api/week-05` (`app/api/week-05/route.ts`) — `streamText` with `tools`, `stopWhen: stepCountIs(5)` for multi-step tool calls.
- **Tool definition file (key deliverable):** [`lib/tools/lookup-concept.ts`](lib/tools/lookup-concept.ts)

## Tool contract

### Name

`lookupConcept` — a server-side tool that looks up a short encyclopedic summary of one concept from the Wikipedia REST API and returns it as structured data.

### Input schema (Zod)

Defined with `z.object` and passed to `tool({ inputSchema })`. Kept to a **single field** on purpose — every field is a hallucination surface, so the model only has to get one thing right.

```ts
z.object({
  term: z
    .string()
    .min(2, "Term must be at least 2 characters.")
    .max(80, "Term is too long.")
    .describe("The single concept, topic, or term to explain — e.g. 'Binary search tree', 'HTTP'. Canonical name, not a full sentence."),
})
```

| Field  | Type     | Constraints        | Notes                                             |
| ------ | -------- | ------------------ | ------------------------------------------------- |
| `term` | `string` | 2–80 chars, required | The `.describe()` text steers the model to pass a canonical noun phrase, not a question. |

### Return shape

`execute` resolves to a typed `ConceptResult` (the object rendered by the result component):

```ts
type ConceptResult = {
  term: string;              // the cleaned term that was looked up
  title: string;             // canonical article title
  summary: string;           // plain-text extract (the explanation)
  description: string | null; // short one-liner, or null if the source omits it
  thumbnail: string | null;   // image URL, or null → card renders a lettered tile
  url: string;               // link to the full article
  readingTimeMin: number;    // derived from summary length (≥ 1)
};
```

`description` and `thumbnail` are **nullable**; the card has an explicit render path for each missing case (the description line is dropped; a lettered placeholder tile replaces the image) rather than leaving a hole.

### Failure behavior

`execute` **throws** on a missing entry (HTTP 404), an upstream error (`!res.ok`), or an empty summary. A thrown `execute` is surfaced by the AI SDK as a `tool-output-error` stream part with an `errorText` message — which the UI renders as a **designed error card**, never a crash.

## The four tool-part states

The tool part (`type: "tool-lookupConcept"`) is rendered by [`components/week5/ToolCall.tsx`](components/week5/ToolCall.tsx) as a small state machine. The outer shell keeps a fixed shape and the inner body is keyed by `state`, so each transition **morphs** (200ms fade + rise) instead of jumping the layout. A stepper and a raw `state` pill in the header make the current state legible at a glance.

| State              | Question answered   | Visual treatment                                                        |
| ------------------ | ------------------- | ----------------------------------------------------------------------- |
| `input-streaming`  | "What is it doing?" | ✨ "Deciding what to look up" + shimmer skeleton + forming-query caret   |
| `input-available`  | "With what input?"  | 🔍 confirmed `term` chip + indeterminate progress bar                    |
| `output-available` | "What came back?"   | **`<ConceptCard />`** — a real result component (image/tile, title, description, summary, reading time, source link) |
| `output-error`     | "What went wrong?"  | ⚠️ red card: friendly headline + the failed term + the raw `errorText` as a muted technical detail |

The result component is [`components/week5/ConceptCard.tsx`](components/week5/ConceptCard.tsx) — the tool output rendered as a designed card, not a JSON dump. A separate `ErrorBanner` in `ConceptChat` handles **stream/model** errors (rate limit, auth, network) with a Retry (`clearError()` + `regenerate()`), distinct from a tool's `output-error`.

### Try the states

Open `/week-05` and use a suggestion chip. The **"qwzxvbn"** chip deliberately looks up a nonexistent term to demonstrate the designed `output-error` state end-to-end.

## Deploy & demo note

Same deploy flow as FE-06 (Vercel + `OPENROUTER_API_KEY`). The Preview URL demo requires a **working OpenRouter API key** — a valid key must be set in Vercel Project Settings → Environment Variables. Submit the Preview URL plus the GitHub link to `lib/tools/lookup-concept.ts`.

## Security note

`.env.local` is intentionally gitignored. Do not upload API keys to GitHub, screenshots, assignment comments, or the client bundle.
