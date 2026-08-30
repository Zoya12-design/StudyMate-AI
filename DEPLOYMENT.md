# Deployment Checklist — StudyMate AI

**Platform:** Vercel
**Live URL:** https://study-mate-ai-lilac.vercel.app
**Repo:** https://github.com/Zoya12-design/StudyMate-AI

## Pre-deploy checklist

- [x] `npm run build` passes locally with no errors
- [x] `npm run test` — 20/20 unit tests passing (Vitest)
- [x] `.env.example` documents every required environment variable (`OPENROUTER_API_KEY`)
- [x] `.npmrc` with `legacy-peer-deps=true` committed, so Vercel's fresh install matches local install (fixed an earlier `ERESOLVE` peer-dependency build failure)
- [x] Lighthouse audit run on the deployed preview (Performance 93, Accessibility 100, Best Practices 100, SEO 100 — see `AUDIT.md`)
- [x] WAVE accessibility scan — 0 errors, 0 contrast errors
- [x] Manual keyboard-only pass on the primary chat flow

## Environment variables (set in Vercel dashboard)

| Variable | Where used |
|---|---|
| `OPENROUTER_API_KEY` | `/api/chat` route, calls the model via OpenRouter |

## How it fails safely

- **Rate limit exceeded** → user sees a readable "you're sending messages too fast" banner, not a crash.
- **Slow/timeout response** → `maxDuration` cap on the API route stops a hung request from running forever; UI shows a timeout message.
- **Empty response from model** → UI shows a "no answer came back, try again" card instead of a blank chat bubble.
- **Mid-stream disconnect** → partial message is kept visible with an inline error note rather than disappearing.
- All four states were deliberately tested using a built-in `simulate` switch on the API route (see `lib/failure-modes.ts`) — see `AUDIT.md` and the README's "Eval Results" section for the full pass/fail table.

## Rollback plan

This is a single-service Vercel deployment with no database migrations, so rollback is low-risk:

1. Vercel keeps every previous deployment. If `main` ships a regression, go to the Vercel dashboard → Deployments → select the last known-good deployment → "Promote to Production." This takes effect immediately, no rebuild needed.
2. Alternatively, `git revert` the bad commit on `main` and push — Vercel auto-deploys the revert.
3. No database/schema to roll back (no persistence layer yet), so there's no data-migration risk either direction.

## Monitoring

- Vercel Analytics is wired in (`@vercel/analytics`) for traffic/error visibility.
- No external uptime monitor set up yet — noted as a future improvement, not a blocker for this capstone.

## Known limitations at deploy time

- Rate limiting is in-memory per server instance — resets on redeploy/cold start. Fine for current demo-scale traffic, not for high concurrent load.
- No conversation persistence — refreshing the page loses chat history.
