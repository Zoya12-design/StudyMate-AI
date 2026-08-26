/**
 * FE-08 — Week 6 reliability lab.
 *
 * The exact same chat component as `/`, mounted with the sabotage controls
 * enabled. Keeping it on its own route means the primary flow at `/` stays clean
 * for grading while every handled failure state is still reproducible on the
 * deployed URL — no DevTools, no unplugging anything.
 */

import type { Metadata } from "next";

import ChatInterface from "@/components/ChatInterface";

export const metadata: Metadata = {
  title: "Reliability Lab · FE-08 — StudyMate AI",
  description:
    "Trigger each handled failure state of the StudyMate AI chat on purpose: API error, mid-stream cut, rate limit, slow response, empty response, offline.",
};

export default function Week6Page() {
  return <ChatInterface failureLab />;
}
