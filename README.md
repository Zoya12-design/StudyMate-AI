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

---

# FE-08 — Error States, Empty States, Edge Cases

FE-08 hardens the **primary flow** (type a question → stream an answer) in place, so the FE-06 route `/` is the graded surface — no rewrite, no new happy path.

Two things are new:

- **`lib/failure-modes.ts`** — the failure inventory as executable data. It is imported by both the server route and the client, so the list in this README, the buttons in the UI, and the branches in the API route cannot drift apart.
- **`/week-06` — the Reliability Lab.** The same `<ChatInterface />` with `failureLab` enabled. It arms a failure, which is then injected into the *next real request*, so a reviewer can trigger every handled state **on the deployed URL** without DevTools, a throttled connection, or a burnt API quota.

```text
app/
  api/chat/route.ts        # + input validation + the `simulate` sabotage switch
  week-06/page.tsx         # <ChatInterface failureLab /> — the Reliability Lab
  error.tsx                # route-level boundary (a page threw during render)
  global-error.tsx         # root boundary — inline styles only, no Tailwind
  not-found.tsx            # designed 404 listing the real routes
components/
  ChatInterface.tsx        # error/empty/offline/slow states, guarded retry
  chat/ErrorBanner.tsx     # role="alert" banner + "Retry this message"
  chat/AssistantSkeleton.tsx  # pending state, shaped like the real bubble
  chat/FailureLab.tsx      # the arm-a-failure panel
  chat/Markdown.tsx        # markdown renderer, extracted so both share it
lib/
  failure-modes.ts         # the inventory + describeError()
```

## Failure inventory

Each row is a real way the flow breaks, and what the user sees instead of a dead screen. `Arm` is the Reliability Lab button that reproduces it.

| Arm                       | What goes wrong                                        | What the user gets                                                                 |
| ------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| 🚫 API error (500)        | The route fails before a single token streams.          | Error banner with the reason + a Retry that resends **only the failed turn**.       |
| ✂️ Connection dies mid-stream | The response stream is cut after the first few tokens. | The partial answer **stays on screen**, flagged incomplete, with a working Retry.   |
| ⏳ Rate limit (429)        | Free-tier keys allow only a few requests per minute.    | Rate-limit-specific copy ("wait ~30s"), not a generic failure.                       |
| 🐢 Slow response          | Several seconds before the first token.                 | A skeleton shaped like the real answer, then a "still working" note after 4s.        |
| 🫥 Empty response         | The stream completes producing no text.                 | An explicit "No answer came back" card with Retry — not a silent blank bubble.       |
| 📴 Network offline        | The device loses its connection.                        | Offline banner, the composer locks, and **whatever was typed is preserved**.         |

Edge cases handled without a simulation:

| Edge case                        | Handling                                                                                          |
| -------------------------------- | ------------------------------------------------------------------------------------------------- |
| Empty / whitespace-only input    | Send stays disabled and Enter is a no-op — no empty request ever reaches the model.                 |
| Over-long input (> 2000 chars)   | A live counter turns red and blocks the send client-side; the route also rejects it with `413`.     |
| First run, no conversation yet   | Onboarding empty state: three real questions that send on tap, plus a link to the concept lookup.  |
| User stops the stream            | Partial answer kept, composer unlocks, **no error shown** — a deliberate stop is not a failure.     |
| Unknown URL / crashed route      | `not-found.tsx` and `error.tsx` render designed pages with a route back into the chat.              |
| Double-tapping Retry             | Guarded by a request-in-flight **ref**, so one tap equals one request (see below).                  |

## How the sabotage switch works

`useChat`'s per-request options carry the armed failure to the server:

```ts
await sendMessage({ text: value }, simulate ? { body: { simulate } } : undefined);
```

`app/api/chat/route.ts` reads `simulate` and branches **before** calling the model — so a demo never spends tokens on a failure. Two branches are worth noting:

- **`mid-stream`** wraps the real streaming response body and calls `controller.error()` after ~500 bytes. Real tokens arrive first, then the connection dies — no knowledge of the wire protocol required, and the client keeps its partial text.
- **`empty`** returns a valid, well-formed stream that yields no text parts at all.

Errors are returned as **plain text**, not JSON: `DefaultChatTransport` surfaces the response body as `error.message`, so a readable sentence becomes usable copy instead of a JSON blob on screen. `describeError()` then maps that message to a title + actionable hint.

Arming is **one-shot** — it disarms itself as soon as the request is sent, so **Retry runs for real** and the recovery can be demonstrated, not just the failure.

## Three details that were bugs first

- **Retry must retry the failed message, not the conversation.** `regenerate()` with no `messageId` targets the last message and slices the history back to that exchange, so it replays exactly the failed turn. On a mid-stream cut it **replaces** the truncated answer instead of appending a second one.
- **A `useState` guard does not stop a double-click.** Two clicks in the same tick both read the pre-update value, so three rapid taps fired three requests and produced two answers to one question. The single-flight lock is a `useRef` written synchronously; the `disabled` attribute is only the visual half.
- **A killed stream looks like a network error.** Matching on `error.message` alone made a mid-stream cut say "check your connection" while the user was plainly online, looking at half an answer. `describeError(error, { truncated })` takes the presence of partial text into account and says "The answer was cut off" instead.

## Loading and empty states

- The skeleton **mirrors the assistant bubble exactly** — same 36px avatar, padding, radius, and three rows at the bubble's 28px line-height — so the first token causes **zero layout shift** (verified: identical `left`, `width`, `padding`, and `border-radius` before and after).
- After 4 seconds it adds "Still working — the free model can take a few seconds on the first token", so a slow answer never reads as frozen.
- The empty state is **onboarding, not decoration**: it names what StudyMate does and offers three real questions that send on tap, plus a link to `/week-05`.
- Every dead end points somewhere: the 404 lists the real routes, `error.tsx` offers "Try again" + "Back to chat", and the offline banner explains that the typed message is still there.

## Responsive / mobile Safari

- `interactiveWidget: "resizes-content"` in the `viewport` export — the layout viewport shrinks with the iOS keyboard instead of being overlaid, which is what makes the bottom-anchored composer behave.
- `h-dvh` for the column, plus a `visualViewport` resize listener that re-anchors the transcript when the keyboard opens or closes.
- `overscroll-contain` on the message list and `overscroll-behavior-y: none` on `body` — no rubber-banding the whole page behind the chat.
- `pb-[max(0.75rem,env(safe-area-inset-bottom))]` on the composer so the home-indicator area never covers the Send button.
- 16px textarea text and `-webkit-text-size-adjust: 100%` — iOS neither zooms on focus nor inflates text on rotate.

## Reproduce every state

At **`/week-06`**, open the Reliability Lab, tap one failure to arm it, then send any question:

| To see                        | Do this                                                                       |
| ----------------------------- | ----------------------------------------------------------------------------- |
| Happy path                    | Send a question with nothing armed.                                           |
| Error banner + working retry  | Arm **API error (500)**, send, then press **Retry this message**.              |
| Partial answer kept           | Arm **Connection dies mid-stream**, send, watch text arrive then stop.         |
| Skeleton → answer, no shift   | Arm **Slow response**, send, watch the skeleton and the 4s note.               |
| Offline lock                  | Tap **Network offline** — type, and note the text survives coming back online. |
| First-run empty state         | Press **New Chat**.                                                           |
| Designed 404                  | Visit any URL that does not exist.                                            |

Reviewer note: `/` is the graded primary flow and has no lab panel. `/week-06` is the same component with the panel switched on.

## Demo checklist

1. Happy path on `/` — question in, answer streams.
2. `/week-06` → arm **API error (500)** → send → banner → **Retry** → real answer arrives.
3. `/week-06` → arm **Connection dies mid-stream** → send → partial answer stays, flagged, Retry replaces it.
4. Phone width: keyboard open, composer still visible, no page rubber-banding.
5. DevTools console on the happy path: clean.

## FE-09 Testing Pass

The project includes a Vitest + React Testing Library component suite and a Playwright end-to-end test.

### Component tests

```bash
npm install
npm run test
```

The component suite covers the primary chat pending/streaming/error states, the validated composer guard rails, markdown rendering, the concept result card, and all four rendered tool-call lifecycle states.

### End-to-end test

Install Chromium once, then run the browser test:

```bash
npx playwright install chromium
npm run test:e2e
```

The E2E test intercepts `POST /api/chat` with a deterministic AI SDK UI message stream, so it never calls the real AI provider.

### CI

GitHub Actions runs the Vitest suite and the Playwright Chromium test on every push and pull request. A failing test makes the workflow fail and blocks a green merge check.
