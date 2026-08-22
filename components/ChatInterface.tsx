"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useEffect, useRef, useState } from "react";

export default function ChatInterface() {
  const {
    messages,
    sendMessage,
    status,
    stop,
    setMessages,
  } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
  });

  const [input, setInput] = useState("");
  const [pinnedToBottom, setPinnedToBottom] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ------------------------------------------------------------
  // Chat status
  // ------------------------------------------------------------

  const isStreaming =
    status === "streaming" || status === "submitted";

  // ------------------------------------------------------------
  // NEW CHAT
  // ------------------------------------------------------------

  const handleNewChat = () => {
    // Stop any active AI generation first
    if (isStreaming) {
      stop();
    }

    // Clear conversation
    setMessages([]);

    // Clear input
    setInput("");

    // Reset scroll state
    setPinnedToBottom(true);

    // Scroll to top after messages are cleared
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    });
  };

  // ------------------------------------------------------------
  // Detect whether user is near bottom
  // ------------------------------------------------------------

  const handleScroll = () => {
    const el = scrollRef.current;

    if (!el) return;

    const distanceFromBottom =
      el.scrollHeight -
      el.scrollTop -
      el.clientHeight;

    setPinnedToBottom(distanceFromBottom < 48);
  };

  // ------------------------------------------------------------
  // Auto-scroll during streaming
  // ------------------------------------------------------------

  useEffect(() => {
    if (pinnedToBottom) {
      bottomRef.current?.scrollIntoView({
        behavior: "auto",
        block: "end",
      });
    }
  }, [messages, pinnedToBottom]);

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
  // Jump to latest
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
          HEADER
      ======================================================== */}

      <header className="shrink-0 border-b border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between">

          <div className="flex items-center gap-3">

            {/* Logo */}
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900 text-lg text-white shadow-sm">
              S
            </div>

            <div>
              <h1 className="text-sm font-bold text-neutral-900 sm:text-base">
                StudyMate AI
              </h1>

              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-green-500" />

                <span className="text-xs text-neutral-500">
                  AI Study Assistant
                </span>
              </div>
            </div>

          </div>

          {/* ====================================================
              HEADER ACTIONS
          ==================================================== */}

          <div className="flex items-center gap-3">

            <div className="hidden text-xs text-neutral-400 md:block">
              Ask • Learn • Understand
            </div>

            <button
              type="button"
              onClick={handleNewChat}
              className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-800 shadow-sm transition hover:border-neutral-300 hover:bg-neutral-50 active:bg-neutral-100 sm:px-4 sm:text-sm"
              title="Start a new chat"
            >
              <span className="mr-1">＋</span>
              New Chat
            </button>

          </div>

        </div>
      </header>

      {/* ========================================================
          MESSAGE AREA
      ======================================================== */}

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="relative flex-1 overflow-y-auto px-3 py-5 sm:px-6"
      >

        <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">

          {/* ====================================================
              EMPTY STATE
          ==================================================== */}

          {messages.length === 0 && (
            <div className="flex min-h-[55vh] flex-col items-center justify-center px-4 text-center">

              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-900 text-2xl text-white shadow-lg">
                S
              </div>

              <h2 className="text-2xl font-bold tracking-tight text-neutral-900">
                What do you want to learn?
              </h2>

              <p className="mt-2 max-w-md text-sm leading-6 text-neutral-500">
                Ask StudyMate AI about computer science,
                programming, exams, assignments, or any topic
                you want to understand.
              </p>

              {/* Suggestions */}

              <div className="mt-7 grid w-full max-w-xl gap-3 sm:grid-cols-3">

                <SuggestionButton
                  icon="📚"
                  text="Explain a concept"
                  onClick={() =>
                    setInput(
                      "Explain a difficult concept in simple words with examples."
                    )
                  }
                />

                <SuggestionButton
                  icon="🧠"
                  text="Exam preparation"
                  onClick={() =>
                    setInput(
                      "Help me prepare this topic for my exam with important points and examples."
                    )
                  }
                />

                <SuggestionButton
                  icon="💻"
                  text="Programming help"
                  onClick={() =>
                    setInput(
                      "Explain this programming concept with a simple example."
                    )
                  }
                />

              </div>

            </div>
          )}

          {/* ====================================================
              MESSAGES
          ==================================================== */}

          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
            />
          ))}

          {/* ====================================================
              THINKING INDICATOR
          ==================================================== */}

          {status === "submitted" && (
            <ThinkingIndicator />
          )}

          {/* Bottom anchor */}

          <div ref={bottomRef} />

        </div>

        {/* ======================================================
            JUMP TO LATEST
        ====================================================== */}

        {!pinnedToBottom && (
          <button
            type="button"
            onClick={jumpToLatest}
            className="sticky bottom-4 left-1/2 mx-auto block -translate-x-1/2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold text-neutral-800 shadow-lg transition hover:bg-neutral-50"
          >
            ↓ Jump to latest
          </button>
        )}

      </div>

      {/* ========================================================
          INPUT AREA
      ======================================================== */}

      <form
        onSubmit={handleSubmit}
        className="shrink-0 border-t border-neutral-200 bg-white px-3 py-3 sm:px-6"
      >

        <div className="mx-auto flex w-full max-w-3xl items-end gap-2">

          <div className="relative flex-1">

            <textarea
              value={input}
              onChange={(e) =>
                setInput(e.target.value)
              }
              onKeyDown={(e) => {

                if (
                  e.key === "Enter" &&
                  !e.shiftKey
                ) {
                  e.preventDefault();
                  handleSubmit(e);
                }

              }}
              placeholder="Ask StudyMate AI anything..."
              rows={1}
              inputMode="text"
              disabled={isStreaming}
              className="max-h-40 min-h-[48px] w-full resize-none rounded-2xl border border-neutral-300 bg-neutral-50 px-4 py-3 text-[16px] leading-snug text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-500 focus:bg-white focus:ring-2 focus:ring-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
            />

          </div>

          {/* ====================================================
              STOP / SEND BUTTON
          ==================================================== */}

          {isStreaming ? (

            <button
              type="button"
              onClick={stop}
              className="h-12 shrink-0 rounded-2xl bg-red-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 active:bg-red-800"
            >
              Stop
            </button>

          ) : (

            <button
              type="submit"
              disabled={!input.trim()}
              className="h-12 shrink-0 rounded-2xl bg-neutral-900 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800 active:bg-neutral-950 disabled:cursor-not-allowed disabled:opacity-30"
            >
              Send
            </button>

          )}

        </div>

        <p className="mx-auto mt-2 hidden w-full max-w-3xl text-center text-[11px] text-neutral-400 sm:block">
          Enter to send • Shift + Enter for a new line
        </p>

      </form>

    </div>
  );
}

// ================================================================
// SUGGESTION BUTTON
// ================================================================

function SuggestionButton({
  icon,
  text,
  onClick,
}: {
  icon: string;
  text: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-neutral-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-md active:translate-y-0"
    >
      <div className="text-xl">
        {icon}
      </div>

      <div className="mt-2 text-xs font-semibold text-neutral-800">
        {text}
      </div>
    </button>
  );
}

// ================================================================
// THINKING INDICATOR
// ================================================================

function ThinkingIndicator() {
  return (
    <div className="flex items-start gap-3">

      {/* AI avatar */}

      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-xs font-bold text-white">
        S
      </div>

      {/* Dots */}

      <div className="flex items-center gap-1.5 rounded-2xl border border-neutral-200 bg-white px-4 py-3 shadow-sm">

        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400 [animation-delay:-0.3s]" />

        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400 [animation-delay:-0.15s]" />

        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400" />

      </div>

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
      className={`flex items-start gap-3 ${
        isUser
          ? "justify-end"
          : "justify-start"
      }`}
    >

      {/* ========================================================
          AI AVATAR
      ======================================================== */}

      {!isUser && (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-xs font-bold text-white shadow-sm">
          S
        </div>
      )}

      {/* ========================================================
          MESSAGE
      ======================================================== */}

      <div
        className={[
          "max-w-[90%] rounded-2xl px-4 py-3 text-[15px] leading-7 shadow-sm sm:max-w-[82%]",
          "break-words",
          isUser
            ? "rounded-br-md bg-neutral-900 text-white"
            : "rounded-bl-md border border-neutral-200 bg-white text-neutral-900",
        ].join(" ")}
      >

        {message.parts?.map(
          (
            part: any,
            index: number
          ) => {

            if (part.type === "text") {

              return (
                <div
                  key={`${message.id}-${index}`}
                  className="study-markdown"
                >

                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{

                      /* -------------------------------
                         HEADINGS
                      -------------------------------- */

                      h1: ({ children }) => (
                        <h1 className="mb-3 mt-1 text-xl font-bold leading-tight">
                          {children}
                        </h1>
                      ),

                      h2: ({ children }) => (
                        <h2 className="mb-2 mt-5 text-lg font-bold leading-tight">
                          {children}
                        </h2>
                      ),

                      h3: ({ children }) => (
                        <h3 className="mb-2 mt-4 text-base font-bold">
                          {children}
                        </h3>
                      ),

                      /* -------------------------------
                         PARAGRAPHS
                      -------------------------------- */

                      p: ({ children }) => (
                        <p className="mb-3 last:mb-0">
                          {children}
                        </p>
                      ),

                      /* -------------------------------
                         BOLD
                      -------------------------------- */

                      strong: ({ children }) => (
                        <strong className="font-bold">
                          {children}
                        </strong>
                      ),

                      /* -------------------------------
                         ITALIC
                      -------------------------------- */

                      em: ({ children }) => (
                        <em className="italic">
                          {children}
                        </em>
                      ),

                      /* -------------------------------
                         BULLET LIST
                      -------------------------------- */

                      ul: ({ children }) => (
                        <ul className="mb-3 list-disc space-y-1 pl-6">
                          {children}
                        </ul>
                      ),

                      /* -------------------------------
                         NUMBERED LIST
                      -------------------------------- */

                      ol: ({ children }) => (
                        <ol className="mb-3 list-decimal space-y-1 pl-6">
                          {children}
                        </ol>
                      ),

                      /* -------------------------------
                         LIST ITEM
                      -------------------------------- */

                      li: ({ children }) => (
                        <li className="pl-1">
                          {children}
                        </li>
                      ),

                      /* -------------------------------
                         INLINE CODE
                      -------------------------------- */

                      code: ({
                        children,
                        className,
                      }) => {

                        const isBlock =
                          className?.includes(
                            "language-"
                          );

                        if (isBlock) {
                          return (
                            <code
                              className={`${className ?? ""} block whitespace-pre-wrap font-mono text-sm`}
                            >
                              {children}
                            </code>
                          );
                        }

                        return (
                          <code className="rounded-md bg-neutral-100 px-1.5 py-0.5 font-mono text-[13px] text-neutral-800">
                            {children}
                          </code>
                        );
                      },

                      /* -------------------------------
                         CODE BLOCK
                      -------------------------------- */

                      pre: ({ children }) => (
                        <pre className="my-4 overflow-x-auto rounded-xl bg-neutral-950 p-4 text-sm leading-6 text-neutral-100">
                          {children}
                        </pre>
                      ),

                      /* -------------------------------
                         BLOCKQUOTE
                      -------------------------------- */

                      blockquote: ({ children }) => (
                        <blockquote className="my-4 border-l-4 border-neutral-300 pl-4 italic text-neutral-600">
                          {children}
                        </blockquote>
                      ),

                      /* -------------------------------
                         HORIZONTAL RULE
                      -------------------------------- */

                      hr: () => (
                        <hr className="my-4 border-neutral-200" />
                      ),

                      /* -------------------------------
                         LINKS
                      -------------------------------- */

                      a: ({ children, href }) => (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium underline underline-offset-2 hover:opacity-70"
                        >
                          {children}
                        </a>
                      ),

                      /* -------------------------------
                         TABLE
                      -------------------------------- */

                      table: ({ children }) => (
                        <div className="my-4 overflow-x-auto rounded-xl border border-neutral-200">
                          <table className="w-full border-collapse text-sm">
                            {children}
                          </table>
                        </div>
                      ),

                      thead: ({ children }) => (
                        <thead className="bg-neutral-100">
                          {children}
                        </thead>
                      ),

                      th: ({ children }) => (
                        <th className="border-b border-neutral-200 px-3 py-2 text-left font-semibold">
                          {children}
                        </th>
                      ),

                      td: ({ children }) => (
                        <td className="border-b border-neutral-100 px-3 py-2">
                          {children}
                        </td>
                      ),

                    }}
                  >
                    {part.text}
                  </ReactMarkdown>

                </div>
              );
            }

            return null;
          }
        )}

      </div>

    </div>
  );
}