# Accessibility & Performance Audit — StudyMate AI

**Assignment:** FE-10 · Frontend AI Engineering · Week 7
**Site audited:** https://study-mate-ai-lilac.vercel.app
**Tools used:** PageSpeed Insights (Lighthouse, mobile), WAVE Evaluation Tool, manual keyboard-only pass

---

## Before

Baseline audit run on the deployed site, mobile preset.

| Metric | Score |
|---|---|
| Performance | 92 |
| Accessibility | 96 |
| Best Practices | 100 |
| SEO | 100 |

**WAVE:** 0 Errors, 2 Contrast Errors, 0 Alerts — AIM Score 9.1/10

**Issues found:**
1. `<h2>What I Built</h2>` rendered with `text-white` inside a section with no explicit background — computed as white-on-white (1:1 contrast ratio), effectively invisible to automated contrast checkers and low-vision users.
2. Helper text ("Enter to send • Shift + Enter for a new line") used `text-neutral-400` on a white background — contrast ratio below the WCAG AA minimum.
3. The disabled "Send" button relied on `opacity-30` on a dark-background/white-text button, which — while not flagged by the automated contrast checker on disabled elements — visually read as too faint against the page background.

---

## Changes made

1. **Heading contrast** — changed the "What I Built" heading from `text-white` to `text-neutral-900` to match its white-background section.
2. **Helper text contrast** — changed `text-neutral-400` to `text-neutral-500` for the composer helper text.
3. **Disabled button state** — replaced `disabled:opacity-30` with explicit `disabled:bg-neutral-600 disabled:text-white` on the Send button, so the disabled state uses a solid, high-contrast color pair instead of a faded blend.
4. **Hero section background** — gave the hero text block (`AI Developer • Web Applications`, `Hi, I'm Zoya.`, intro paragraph) an explicit `bg-[#0b0f1a]` so text contrast is computable against a real background color rather than an unrelated fixed-position 3D layer.

---

## After

Re-run after the fixes above, deployed and hard-refreshed.

| Metric | Score |
|---|---|
| Performance | 93 |
| Accessibility | 100 |
| Best Practices | 100 |
| SEO | 100 |

**WAVE:** 0 Errors, 0 Contrast Errors, 0 Alerts — AIM Score 10/10

**Deltas:**
- Accessibility: **96 → 100** (+4)
- Performance: **92 → 93** (+1)
- WAVE contrast errors: **2 → 0**
- WAVE AIM Score: **9.1 → 10.0**

---

## Keyboard-only pass

Navigated the primary flow (header links, starter-question buttons, composer, Send/Stop button) using Tab / Shift+Tab / Enter only, no mouse:

- All interactive elements (Concept lookup, Reliability lab, New Chat, starter question cards, textarea, Send button) are reachable and operable via keyboard, in a logical order.
- The composer textarea accepts input and submits on Enter (Shift+Enter for a newline) without a mouse.
- The "Stop" button (shown while a response is streaming) is keyboard-reachable, giving a keyboard-only user a way to halt a stream in progress.

## AI-specific accessibility

- The message list and error/status banners (offline banner, error banner, "No answer came back" card) use `role="status"` / are rendered as live regions of the page so assistive tech is informed of state changes without requiring focus to move.
- The composer's textarea carries an explicit `aria-label="Ask StudyMate AI anything"` since its visible placeholder text disappears once typing starts.
- The Stop button remains keyboard-focusable during streaming, giving a keyboard/screen-reader user parity with a mouse user's ability to interrupt a response.

---

## Notes

- Automated tools (Lighthouse, WAVE) don't guarantee full compliance; this pass combines both with a manual keyboard walkthrough per the assignment brief.
- The 3D hero scene (from FE-AA2) was checked as part of this audit — it doesn't block or trap keyboard focus, and respects `prefers-reduced-motion` by falling back to a static graphic.
