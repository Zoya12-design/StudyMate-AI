"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * ─────────────────────────────────────────────────────────────
 *  SIGNATURE HERO — "Lamp & Ink" Aurora
 *  A warm desk-lamp glow bends a cool ink-like flow field toward
 *  the cursor, evoking a late-night study session lit by a single
 *  lamp. Built as StudyMate AI's fullscreen hero (FE-AA3).
 * ─────────────────────────────────────────────────────────────
 */

// ---------- Vertex shader ----------
// Just passes the UV coordinates through — the whole picture is
// painted in the fragment shader below, so the vertex stage does
// almost nothing except position the fullscreen plane.
const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

// ---------- Fragment shader ----------
const fragmentShader = /* glsl */ `
  precision highp float;

  uniform float u_time;
  uniform vec2  u_resolution;
  uniform vec2  u_mouse;      // normalized 0..1, smoothed on the JS side
  varying vec2  vUv;

  // ---- 3D Simplex noise (Ashima Arts / Ian McEwan, MIT licensed) ----
  // Standard smooth-noise building block, not hand-written from scratch.
  // It returns a pseudo-random value that changes smoothly across space,
  // which is what makes the "ink" look organic instead of like static.
  vec3 mod289(vec3 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
  vec4 mod289(vec4 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
  vec4 permute(vec4 x){ return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v){
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  // ---- Fractal sum of a few noise octaves = the "ink" flow field ----
  // Stacking noise at increasing frequency and decreasing amplitude is
  // the classic way to get a richer, more organic pattern than a
  // single noise() call gives you.
  float flow(vec2 p, float t){
    float n = 0.0;
    n += 0.55 * snoise(vec3(p * 1.2, t * 0.15));
    n += 0.30 * snoise(vec3(p * 2.4 + 5.0, t * 0.25));
    n += 0.15 * snoise(vec3(p * 4.8 + 9.0, t * 0.35));
    return n;
  }

  void main(){
    // Aspect-correct UVs, centered at (0,0), so the pattern isn't
    // stretched on wide screens. This is where u_resolution is used.
    vec2 uv = vUv * 2.0 - 1.0;
    uv.x *= u_resolution.x / u_resolution.y;

    // Mouse in the same centered space, used to bend the flow field
    // toward the cursor — the "lamp reaches for you" effect.
    // This is where u_mouse is used.
    vec2 mouse = u_mouse * 2.0 - 1.0;
    mouse.x *= u_resolution.x / u_resolution.y;
    float distToMouse = length(uv - mouse);
    float pull = smoothstep(1.2, 0.0, distToMouse) * 0.35;
    vec2 warped = uv + normalize(mouse - uv + 0.0001) * pull;

    // Sample the flow field twice at slightly offset time (u_time) to
    // get a second layer — gives the ink some depth as it drifts.
    float n1 = flow(warped, u_time);
    float n2 = flow(warped * 1.6 + 3.3, u_time * 0.8 + 10.0);
    float n = n1 * 0.7 + n2 * 0.3;

    // ---- Palette: ink-navy base -> cool blue -> warm lamp amber ----
    vec3 navy   = vec3(0.043, 0.071, 0.125); // #0B1220 page background
    vec3 blue   = vec3(0.243, 0.486, 0.694); // #3E7CB1 cool ink
    vec3 mint   = vec3(0.498, 0.847, 0.745); // #7FD8BE highlighter accent
    vec3 amber  = vec3(0.949, 0.651, 0.353); // #F2A65A lamp glow

    vec3 color = navy;
    color = mix(color, blue, smoothstep(-0.2, 0.4, n));
    color = mix(color, mint, smoothstep(0.25, 0.55, n) * 0.6);

    // The lamp glow only shows up near the cursor, not everywhere —
    // that's what sells it as "a light following you" rather than a
    // flat color band across the whole screen.
    float glow = smoothstep(0.9, 0.0, distToMouse) * 0.8;
    color = mix(color, amber, glow * smoothstep(0.0, 0.6, n + 0.3));

    // Vignette keeps the corners darker so headline text sitting on
    // top stays readable everywhere, not just dead-center.
    float vign = smoothstep(1.4, 0.2, length(uv));
    color *= mix(0.55, 1.0, vign);

    // Cheap film-grain: a per-pixel hash added at low amplitude.
    // Breaks up banding in the smooth gradient and adds texture.
    float grain = fract(sin(dot(vUv * u_resolution.xy, vec2(12.9898,78.233))) * 43758.5453);
    color += (grain - 0.5) * 0.025;

    gl_FragColor = vec4(color, 1.0);
  }
`;

function AuroraPlane() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { size } = useThree();
  const mouseTarget = useRef(new THREE.Vector2(0.5, 0.5));
  const mouseSmoothed = useRef(new THREE.Vector2(0.5, 0.5));

  const uniforms = useMemo(
    () => ({
      u_time: { value: 0 },
      u_resolution: { value: new THREE.Vector2(size.width, size.height) },
      u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    const handlePointer = (e: PointerEvent) => {
      mouseTarget.current.set(
        e.clientX / window.innerWidth,
        1.0 - e.clientY / window.innerHeight
      );
    };
    window.addEventListener("pointermove", handlePointer);
    return () => window.removeEventListener("pointermove", handlePointer);
  }, []);

  useFrame((_, delta) => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.u_time.value += delta;
    materialRef.current.uniforms.u_resolution.value.set(size.width, size.height);
    // Smooth (lerp) the mouse so the pull feels like it's drifting
    // toward the cursor rather than snapping to it every frame.
    mouseSmoothed.current.lerp(mouseTarget.current, 0.06);
    materialRef.current.uniforms.u_mouse.value.copy(mouseSmoothed.current);
  });

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}

/**
 * Static fallback used for prefers-reduced-motion, and as the very
 * first paint before the canvas mounts. Same palette, zero motion.
 */
function StaticAuroraFallback() {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        background:
          "radial-gradient(circle at 30% 30%, #F2A65A22 0%, transparent 45%), radial-gradient(circle at 70% 60%, #7FD8BE22 0%, transparent 50%), linear-gradient(160deg, #0B1220 0%, #14233A 60%, #0B1220 100%)",
      }}
    />
  );
}

export default function AuroraStudyHero({
  eyebrow = "StudyMate AI",
  headline = "Late-night studying, with a lamp that leans toward you.",
  subline = "A streaming study assistant that stays warm, focused, and awake when you are.",
}: {
  eyebrow?: string;
  headline?: string;
  subline?: string;
}) {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);

  // prefers-reduced-motion: swap to a static frame, no animation loop.
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mql.matches);
    const onChange = () => setReducedMotion(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  // Page Visibility API: fully pause the WebGL render loop on hidden tabs
  // instead of just skipping uniform updates, so it doesn't burn battery.
  useEffect(() => {
    const onVisibility = () => setTabHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  return (
    <section
      style={{
        position: "relative",
        width: "100%",
        height: "100dvh",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {reducedMotion ? (
        <StaticAuroraFallback />
      ) : (
        <Canvas
          dpr={[1, 2]} // caps devicePixelRatio at 2 so high-DPI phones don't tank the frame rate
          frameloop={tabHidden ? "never" : "always"} // pauses rendering entirely when the tab isn't visible
          gl={{ antialias: false, powerPreference: "high-performance" }}
          style={{ position: "absolute", inset: 0 }}
        >
          <AuroraPlane />
        </Canvas>
      )}

      <div
        style={{
          position: "relative",
          zIndex: 1,
          textAlign: "center",
          maxWidth: 640,
          padding: "0 24px",
          color: "#F5F1E8",
        }}
      >
        <p
          style={{
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 13,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#A9B4C2",
            marginBottom: 16,
          }}
        >
          {eyebrow}
        </p>
        <h1
          style={{
            fontFamily: '"Fraunces", Georgia, serif',
            fontWeight: 600,
            fontSize: "clamp(2rem, 5vw, 3.5rem)",
            lineHeight: 1.1,
            margin: 0,
            textShadow: "0 2px 24px rgba(11,18,32,0.6)",
          }}
        >
          {headline}
        </h1>
        <p
          style={{
            marginTop: 20,
            fontSize: "1.05rem",
            color: "#D7DCE4",
            textShadow: "0 1px 12px rgba(11,18,32,0.5)",
          }}
        >
          {subline}
        </p>
      </div>
    </section>
  );
}
