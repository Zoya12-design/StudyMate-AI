# StudyMate AI

An AI-powered streaming study assistant that helps students understand concepts, prep for exams, and debug their thinking through conversational AI, with tool-backed concept lookup.

**Live:** https://study-mate-ai-lilac.vercel.app

## Track Deliverables (index)

- **Live site:** https://study-mate-ai-lilac.vercel.app
- **Retrospective:** [RETROSPECTIVE.md](./RETROSPECTIVE.md)
- **Build-in-public post:** (https://study-mate-ib88a6i9u-zoyahulio1.vercel.app/chat)
- **Demo video:** https://drive.google.com/file/d/1YvTOHWWXx2_AUEdzSJOqhE8XaAid0hEd/view?usp=sharing


## Screenshots

<!-- Drop 2-3 screenshots here: hero, chat interface, concept lookup in action -->
![Hero](./docs/screenshot-hero.png)
![Chat](./docs/screenshot-chat.png)

## Features

- Streaming AI chat (word-by-word response)
- Concept lookup via tool calling
- Reliability-tested error/empty/loading states
- Responsive, mobile-friendly interface
- Custom fullscreen shader hero (GLSL, `u_time`/`u_resolution`/`u_mouse`)
- Rate-limited API route to prevent abuse

## Tech Stack

Next.js · React · TypeScript · Tailwind CSS · @react-three/fiber (shader hero) · Vercel Analytics

## Run Locally

```bash
git clone https://github.com/Zoya12-design/StudyMate-AI.git
cd StudyMate-AI
npm install --legacy-peer-deps
cp .env.example .env.local   # fill in your keys, see table below
npm run dev
```
Open http://localhost:3000

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `OPENROUTER_API_KEY` | Yes | API key for OpenRouter, used by `/api/chat` to call the AI model |

## Architecture

- `app/` — Next.js App Router pages and layouts
- `app/api/chat/` — streaming chat API route, rate-limited, `maxDuration` capped
- `components/hero/` — landing hero, including the custom shader (`AuroraStudyHero.tsx`)
- `components/chat/` — chat UI components
- `lib/` — shared utilities
- `data/` — static content/concept data used by tool calling

## Key Decisions

- Chose a fully custom GLSL shader for the hero instead of a template gradient, to make the portfolio piece distinctive.
- In-memory rate limiting instead of a database-backed one, since this is a personal-scale project — documented as a known limitation.
- `.npmrc` with `legacy-peer-deps=true` committed to keep Vercel builds consistent with local installs given a peer-dependency conflict between the AI SDK and React 18.

### 3D Hero Scene — "Knowledge Core" (`components/hero/Hero3D.tsx`)

An earlier/alternate hero exploration: a wireframe icosahedron surrounded by six glowing nodes connected with thin lines, evoking connected knowledge / mind-mapped study material. The cluster tilts toward the cursor (lerped, not snapped) with a slow idle spin so it stays alive when the cursor isn't moving.

- **Real 3D scene, no model download** — pure procedural geometry via React Three Fiber, so there's no GLB/asset to fetch or compress.
- **Interaction beyond orbiting** — cursor-position tilt on the whole group (see `useFrame` in `KnowledgeCore`), rather than free orbit controls.
- **Loads responsibly** — canvas mounts a frame after first paint so it never blocks LCP; `HeroFallback` (a tiny inline SVG) covers the loading gap and the reduced-motion case.
- **Mobile-usable** — `dpr={[1, 1.5]}` caps pixel ratio so it doesn't hammer mid-range GPUs; pointer events behave the same on touch.
- **Reduced-motion** — a `useReducedMotion` hook checks `prefers-reduced-motion` and swaps to the static SVG fallback.

**Perf note:** `three` + `@react-three/fiber` add roughly 150–170KB gzipped, with no model asset since geometry is procedural. Mitigated by code-splitting the hero via `lazy()` so the chunk never loads on pages without it (dashboard, quiz screens). The scene (1 wireframe mesh, 6 small spheres, 6 line segments) stays well under a 50+ FPS budget on mid-range phones without needing frustum-culling tricks.

**With more time:** swap the static SVG fallback for a CSS-only animated version (a subtle glow pulse, not movement, so it's still safe for reduced-motion/vestibular sensitivity); tie node colors to real study data (subjects with more due reviews glow brighter) so the hero reflects the user's own state instead of being purely decorative; replace the generic icosahedron with a custom DRACO-compressed logo mesh once a 3D asset pipeline exists.

## How AI Tools Built This

<!-- Be specific, not "AI helped me code." Examples of the kind of detail expected: -->
- Used Claude to scaffold the streaming chat route and debug a TypeScript module-resolution error in `layout.tsx`.
- Used Claude to write and explain the custom GLSL fragment shader (simplex noise flow field, mouse-reactive glow) for the hero — I can walk through what each shader block does.
- Fixed an `ERESOLVE` peer-dependency conflict (Vercel build) by adding `.npmrc` with `legacy-peer-deps=true` after diagnosing the mismatch between `@react-three/fiber` and the project's React version.
- Manually reviewed and tested every AI-suggested change locally before deploying.

## Who this is for

Students who need quick, conversational help understanding a concept, prepping for an exam, or debugging their own reasoning — without needing to leave a chat window to look things up elsewhere.

## Usage Examples

- **Explain a concept:** "Explain binary search trees in simple words with a small example."
- **Prep for an exam:** "Give me a 5-point revision sheet on photosynthesis for a school exam."
- **Debug your thinking:** "Why does a Python for-loop over a list I am editing skip items?"

Type a question in the chat box on the homepage — responses stream in token-by-token, same as a real conversation.

## Architecture Sketch

```
Browser (chat UI)
     │  POST /api/chat  { messages, simulate? }
     ▼
Next.js API Route (app/api/chat/route.ts)
     │  - rate limit check (per IP)
     │  - input validation (empty / too long)
     │  - optional failure simulation (FE-08 sabotage switch)
     ▼
AI SDK → OpenRouter → model
     │  streamText(), token-by-token
     ▼
UI message stream ──► Browser renders streaming text
```

## Eval Results (v2)

<!-- Fill in your actual FE-08/reliability-testing numbers here, e.g. from AUDIT.md -->
Tested against the deliberate failure modes built into the route (`simulate` switch): HTTP 500, simulated rate-limit, slow response, empty stream, and mid-stream disconnect. Each surfaces a specific, readable error message in the UI instead of a blank or crashed screen — see `lib/failure-modes.ts` and the `AUDIT.md` file for the full pass/fail table from that testing pass.

## Limitations

- Rate limiting is in-memory and resets on server restart/redeploy — fine for a demo, not for high-traffic production.
- No conversation persistence — refreshing the page loses chat history.
- FlyRank internship graduate badge pending, will be added to footer once issued.