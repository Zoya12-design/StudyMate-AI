import ChatInterface from "@/components/ChatInterface";

/**
 * Dedicated full-viewport route for StudyMate AI's main chat, matching the
 * pattern already used by /week-05 and /week-06. ChatInterface owns the whole
 * screen (h-dvh, fixed layout, iOS keyboard handling) — it is only safe to
 * mount on its own route, not nested inside a longer scrolling page.
 */
export default function ChatPage() {
  return <ChatInterface />;
}