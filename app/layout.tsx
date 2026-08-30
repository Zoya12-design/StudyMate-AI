import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "StudyMate AI — Streaming Study Assistant",
  description:
    "StudyMate AI: a streaming AI study assistant with tool-backed concept lookup and designed error, empty, and loading states.",
};

/**
 * FE-08 — mobile viewport.
 *
 * `interactiveWidget: "resizes-content"` is the fix for the classic iOS Safari
 * bug where the on-screen keyboard covers a bottom-anchored composer: the layout
 * viewport shrinks with the keyboard instead of being overlaid, which is what
 * makes the `h-dvh` column behave. `maximumScale` is left alone so pinch-zoom
 * still works.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
  themeColor: "#faf9f7",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}