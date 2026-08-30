import { useEffect, useState } from "react";

/**
 * Returns true if the user has requested reduced motion at the OS level,
 * or if we're on a low-power/mobile-data situation we want to be cautious about.
 * Used to decide whether to mount the 3D canvas at all.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);

    const listener = (e: MediaQueryListEvent) => setReduced(e.matches);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, []);

  return reduced;
}
