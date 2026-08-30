# StudyMate AI — 3D Hero Scene (FE-AA2)

## What this is
A "Knowledge Core" hero scene: a wireframe icosahedron surrounded by six
glowing nodes connected with thin lines, evoking StudyMate AI's idea of
connected knowledge / mind-mapped study material. Instead of orbit
controls, the whole cluster tilts toward the cursor (lerped, not snapped),
with a slow idle spin so it stays alive when the cursor isn't moving.

## Install
```bash
npm install three @react-three/fiber @react-three/drei
npm install -D @types/three
```

Drop the `src/components/hero/` folder into your project, then render:
```tsx
import HeroSection from "./components/hero/Hero3D";
// or, for a code-split chunk:
// const HeroSection = lazy(() => import("./components/hero/Hero3D"));
```

## How the requirements are covered
- **Real 3D scene**: React Three Fiber, no GLB needed — pure procedural
  geometry, so there's no model download at all.
- **Interaction beyond orbiting**: cursor-position tilt on the whole group
  (see `useFrame` in `KnowledgeCore`).
- **Loads responsibly**: no external model to compress (procedural
  geometry keeps the payload to just the R3F/three bundle); canvas mounts
  a frame after first paint so it never blocks LCP; `HeroFallback` (a
  tiny inline SVG) covers the loading gap and the reduced-motion case.
- **Mobile-usable**: `dpr={[1, 1.5]}` caps pixel ratio so it doesn't
  hammer mid-range GPUs; pointer events work the same on touch.
- **Reduced-motion**: `useReducedMotion` hook checks
  `prefers-reduced-motion` and swaps to the static SVG fallback.

## Perf note (FE-10 lens)
- Added bundle weight: `three` + `@react-three/fiber` ≈ 150–170KB
  gzipped. No model asset, since geometry is procedural — this is the
  single biggest lever for keeping the payload small on a study app
  where most users are on mobile.
- Mitigation: code-split via `lazy()` so this chunk never loads on pages
  without the hero (dashboard, quiz screens, etc.).
- Target: steady 50+ FPS on a mid-range phone — the scene only has 1
  wireframe mesh, 6 small spheres, and 6 line segments, so it stays well
  under budget even without frustum culling tricks.

## What I'd add with more time
- Swap the static SVG fallback for a tiny CSS-only animated version so
  reduced-motion users still get *some* liveliness without actual motion
  that could trigger vestibular issues (a subtle glow pulse, not
  movement).
- Tie node colors to actual study data (e.g. subjects with more due
  reviews glow brighter) so the hero becomes a live preview of the
  user's own StudyMate state instead of purely decorative.
- Add a DRACO-compressed custom logo mesh as the core instead of a
  generic icosahedron, once there's a 3D asset pipeline in place.
