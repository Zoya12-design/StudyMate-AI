"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";

export default function ChatInterface() {
  const { messages, sendMessage, status, stop } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
  });

  const [input, setInput] = useState("");
  const [pinnedToBottom, setPinnedToBottom] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ------------------------------------------------------------
  // Detect whether the user is currently near the bottom.
  // If the user scrolls up, automatic scrolling stops.
  // ------------------------------------------------------------
  const handleScroll = () => {
    const el = scrollRef.current;

    if (!el) return;

    const distanceFromBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight;

    setPinnedToBottom(distanceFromBottom < 48);
  };

  // ------------------------------------------------------------
  // Automatically scroll while new streamed content arrives.
  // This runs whenever messages change.
  // ------------------------------------------------------------
  useEffect(() => {
    if (pinnedToBottom) {
      bottomRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  }, [messages, pinnedToBottom]);

  // ------------------------------------------------------------
  // Chat status
  // ------------------------------------------------------------
  const isStreaming =
    status === "streaming" || status === "submitted";

  // ------------------------------------------------------------
  // Send message
  // ------------------------------------------------------------
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const text = input.trim();

    if (!text || isStreaming) {
      return;
    }

    sendMessage({
      text,
    });

    setInput("");
    setPinnedToBottom(true);
  };

  // ------------------------------------------------------------
  // Jump to latest message
  // ------------------------------------------------------------
  const jumpToLatest = () => {
    setPinnedToBottom(true);

    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  };

  return (
    <div className="flex h-dvh w-full flex-col bg-[#faf9f7]">
      {/* ========================================================
          MESSAGE AREA
      ======================================================== */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="relative flex-1 overflow-y-auto px-3 py-4 sm:px-6"
      >
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
          {/* Empty state */}
          {messages.length === 0 && (
            <div className="mt-16 text-center">
              <h1 className="text-xl font-semibold text-neutral-800">
                StudyMate AI
              </h1>

              <p className="mt-2 text-sm text-neutral-400">
                Ask something to start the conversation.
              </p>
            </div>
          )}

          {/* Messages */}
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
            />
          ))}

          {/* Thinking indicator */}
          {status === "submitted" && <ThinkingIndicator />}

          {/* Bottom anchor */}
          <div ref={bottomRef} />
        </div>

        {/* Jump to latest button */}
        {!pinnedToBottom && (
          <button
            type="button"
            onClick={jumpToLatest}
            className="sticky bottom-4 left-1/2 mx-auto block -translate-x-1/2 rounded-full bg-neutral-900 px-4 py-2 text-xs font-medium text-white shadow-lg transition hover:bg-neutral-700"
          >
            Jump to latest ↓
          </button>
        )}
      </div>

      {/* ========================================================
          INPUT / COMPOSER
      ======================================================== */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-neutral-200 bg-white px-3 py-3 sm:px-6"
      >
        <div className="mx-auto flex w-full max-w-2xl items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Message the assistant..."
            rows={1}
            inputMode="text"
            disabled={isStreaming}
            className="max-h-40 min-h-[44px] flex-1 resize-none rounded-2xl border border-neutral-300 bg-neutral-50 px-4 py-3 text-[16px] leading-snug text-neutral-900 outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 disabled:opacity-60"
          />

          {/* Stop button while AI is generating */}
          {isStreaming ? (
            <button
              type="button"
              onClick={stop}
              className="h-11 shrink-0 rounded-full bg-red-600 px-5 text-sm font-medium text-white transition hover:bg-red-700 active:bg-red-800"
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="h-11 shrink-0 rounded-full bg-neutral-900 px-5 text-sm font-medium text-white transition hover:bg-neutral-700 active:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-30"
            >
              Send
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

// ================================================================
// THINKING INDICATOR
// ================================================================

function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-1.5 self-start rounded-2xl border border-neutral-200 bg-white px-4 py-3">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400 [animation-delay:-0.3s]" />

      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400 [animation-delay:-0.15s]" />

      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400" />
    </div>
  );
}

// ================================================================
// MESSAGE BUBBLE
// ================================================================

function MessageBubble({
  message,
}: {
  message: any;
}) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex ${
        isUser ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={[
          "max-w-[85%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed",
          "break-words",
          isUser
            ? "bg-neutral-900 text-white"
            : "border border-neutral-200 bg-white text-neutral-900",
        ].join(" ")}
      >
        {/* ======================================================
            STREAMED MESSAGE PARTS

            AI SDK sends text as message.parts.
            We render every text part immediately.
        ====================================================== */}

        {message.parts?.map(
          (part: any, index: number) => {
            if (part.type === "text") {
              return (
                <span
                  key={`${message.id}-${index}`}
                  className="whitespace-pre-wrap"
                >
                  {part.text}
                </span>
              );
            }

            return null;
          }
        )}
      </div>
    </div>
  );
}