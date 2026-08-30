"use client";

import dynamic from "next/dynamic";

const HeroSection = dynamic(() => import("./Hero3D"), { ssr: false });

export default function HeroSectionClient() {
  return < HeroSection/>;
}