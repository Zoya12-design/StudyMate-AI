"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { HeroFallback } from "./HeroFallback";
import { useReducedMotion } from "./useReducedMotion";

const NODE_COUNT = 6;

function ThreeScene({ container }: { container: HTMLDivElement }) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.1,
    100
  );
  camera.position.z = 5;

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  const group = new THREE.Group();
  group.scale.set(1.6, 1.6, 1.6);
  scene.add(group);

  const coreGeo = new THREE.IcosahedronGeometry(1, 0);
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0x4d8dff,
    wireframe: true,
    emissive: 0x4d8dff,
    emissiveIntensity: 0.4,
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  group.add(core);

  const nodePositions: THREE.Vector3[] = [];
  for (let i = 0; i < NODE_COUNT; i++) {
    const angle = (i / NODE_COUNT) * Math.PI * 2;
    nodePositions.push(
      new THREE.Vector3(Math.cos(angle) * 1.8, Math.sin(angle) * 1.8, 0)
    );
  }

  const nodeGeo = new THREE.SphereGeometry(0.06, 12, 12);
  const nodeMat = new THREE.MeshStandardMaterial({
    color: 0xffb454,
    emissive: 0xffb454,
    emissiveIntensity: 1.1,
  });

  nodePositions.forEach((pos) => {
    const node = new THREE.Mesh(nodeGeo, nodeMat);
    node.position.copy(pos);
    group.add(node);

    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      pos,
    ]);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0xffb454,
      transparent: true,
      opacity: 0.5,
    });
    group.add(new THREE.Line(lineGeo, lineMat));
  });

  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const pointLight = new THREE.PointLight(0x4d8dff, 1.2);
  pointLight.position.set(3, 3, 3);
  scene.add(pointLight);

  const mouse = { x: 0, y: 0 };
  const handlePointerMove = (e: PointerEvent) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  };
  window.addEventListener("pointermove", handlePointerMove);

  // scroll progress: 0 at top of page, 1 once scrolled through ~1.5 screens
  let scrollProgress = 0;
  const handleScroll = () => {
    const maxScroll = window.innerHeight * 1.5;
    scrollProgress = Math.min(window.scrollY / maxScroll, 1);
  };
  window.addEventListener("scroll", handleScroll, { passive: true });

  const clock = new THREE.Clock();
  let frameId: number;

  const animate = () => {
    const delta = clock.getDelta();
    const targetY = mouse.x * 0.6;
    const targetX = mouse.y * 0.3;
    group.rotation.y += (targetY - group.rotation.y) * 2 * delta;
    group.rotation.x += (targetX - group.rotation.x) * 2 * delta;
    // scroll speeds up the spin as you leave the hero
    group.rotation.z += delta * (0.05 + scrollProgress * 0.6);

    // scroll subtly speeds up spin and shifts scale, but stays visible
    // throughout the page since this is now a persistent background
    const scale = 1.6 * (1 - scrollProgress * 0.25);
    group.scale.set(scale, scale, scale);
    renderer.domElement.style.opacity = String(1 - scrollProgress * 0.4);

    renderer.render(scene, camera);
    frameId = requestAnimationFrame(animate);
  };
  animate();

  const handleResize = () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  };
  window.addEventListener("resize", handleResize);

  return () => {
    cancelAnimationFrame(frameId);
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("resize", handleResize);
    window.removeEventListener("scroll", handleScroll);
    coreGeo.dispose();
    coreMat.dispose();
    nodeGeo.dispose();
    nodeMat.dispose();
    renderer.dispose();
    if (container.contains(renderer.domElement)) {
      container.removeChild(renderer.domElement);
    }
  };
}

export default function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || reducedMotion || !containerRef.current) return;
    const cleanup = ThreeScene({ container: containerRef.current });
    return cleanup;
  }, [mounted, reducedMotion]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        zIndex: -1,
        background:
          "radial-gradient(circle at 50% 40%, #14213d 0%, #06090f 75%)",
      }}
    >
      {reducedMotion || !mounted ? (
        <HeroFallback />
      ) : (
        <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      )}
    </div>
  );
}