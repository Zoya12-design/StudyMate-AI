import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Streaming Chat — FE-06",
  description: "FlyRank FE-06 assignment: streaming AI chat interface",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
