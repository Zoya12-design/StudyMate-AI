# FE-06 — StudyMate AI Streaming Chat

A mobile-friendly streaming AI chat for the StudyMate AI capstone, built with Next.js + Vercel AI SDK + Google Gemini.

FlyRank explicitly allows interns to use another provider when Claude access is unavailable. This version uses Gemini so the project can be completed without a paid Claude account.

## Structure

```text
app/
  api/chat/route.ts       # server: streamText -> Gemini -> UI message stream
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
4. Create a Gemini API key in Google AI Studio and put it in `.env.local` as `GOOGLE_GENERATIVE_AI_API_KEY`.
5. Run `npm run dev`.
6. Open `http://localhost:3000`.

Never put the API key in client-side code or commit `.env.local`.

## FE-06 evaluation checklist

- **Visible streaming:** `streamText()` returns a UI message stream and `useChat` renders `message.parts` as they arrive.
- **Stop mid-stream:** the Stop button calls `stop()`, the partial assistant response remains in chat state, and the composer becomes usable again.
- **Multiple turns:** `useChat` maintains the conversation's `messages[]` and sends the history to `/api/chat` on each turn.
- **Server-side key:** only the server route uses the Gemini provider; the browser never receives the API key.
- **Phone width:** the chat uses a single-column mobile-first layout and a 16px textarea to avoid mobile browser zoom.
- **Scroll robustness:** auto-scroll stays pinned only while the user is near the bottom. Scrolling upward releases the pin and shows a “Jump to latest” control.
- **Thinking handoff:** a submitted-state typing indicator appears before the first streamed text arrives.
- **Streaming-safe text:** messages are rendered as text rather than raw HTML, so incomplete markdown cannot break the UI while tokens are arriving.

## Deploy to Vercel

1. Push this project to GitHub.
2. Import the repository into Vercel.
3. Add `GOOGLE_GENERATIVE_AI_API_KEY` in Vercel Project Settings → Environment Variables.
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

## Security note

`.env.local` is intentionally gitignored. Do not upload API keys to GitHub, screenshots, assignment comments, or the client bundle.
