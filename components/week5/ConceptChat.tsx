"use client";

/**
 * FE-07 — tool-enabled chat shell (Week 5).
 *
 * Same streaming spine as FE-06's ChatInterface, but typed with `Week5UIMessage`
 * so `message.parts` includes a typed `tool-lookupConcept` part, which is handed
 * to <ToolCall /> to render the four-state lifecycle.
 */

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useEffect, useRef, useState } from "react";

import type { Week5UIMessage } from "@/lib/week5-types";
import ToolCall from "./ToolCall";

const SUGGESTIONS = [
  { icon: "🌳", label: "Explain binary search trees", trigger: false },
  { icon: "🧪", label: "What is photosynthesis?", trigger: false },
  { icon: "🌐", label: "Define HTTP", trigger: false },
  {
    icon: "⚠️",
    label: "Look up the concept “qwzxvbn”",
    trigger: true, // deliberately triggers the designed error state
  },
];

export default function ConceptChat() {
  const { messages, sendMessage, status, stop, error, regenerate, clearError } =
    useChat<Week5UIMessage>({
      transport: new DefaultChatTransport({ api: "/api/week-05" }),
    });

  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const isStreaming = status === "streaming" || status === "submitted";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
  }, [messages]);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;
    sendMessage({ text: trimmed });
    setInput("");
  };

  return (
    <div className="flex h-dvh w-full flex-col bg-[#faf9f7]">
      {/* ---- header ------------------------------------------------------ */}
      <header className="shrink-0 border-b border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900 text-lg text-white shadow-sm">
              S
            </div>
            <div>
              <h1 className="text-sm font-bold text-neutral-900 sm:text-base">
                StudyMate AI — Concept Lookup
              </h1>
              <div className="flex items-center gap-1.5">
                <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                  FE-07 · Week 5
                </span>
                <span className="text-xs text-neutral-500">
                  tool-calling demo
                </span>
              </div>
            </div>
          </div>

          <Link
            href="/"
            className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-800 shadow-sm transition hover:bg-neutral-50 sm:text-sm"
          >
            ← Chat
          </Link>
        </div>
      </header>

      {/* ---- messages ---------------------------------------------------- */}
      <div className="relative flex-1 overflow-y-auto px-3 py-5 sm:px-6">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
          {messages.length === 0 && (
            <EmptyState onPick={(text) => send(text)} />
          )}

          {messages.map((message) => (
            <Message key={message.id} message={message} />
          ))}

          {status === "submitted" && <Thinking />}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* ---- stream/model error (distinct from a tool's output-error) ---- */}
      {error && (
        <ErrorBanner
          message={error.message}
          onRetry={() => {
            clearError();
            regenerate();
          }}
          onDismiss={clearError}
        />
      )}

      {/* ---- composer ---------------------------------------------------- */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="shrink-0 border-t border-neutral-200 bg-white px-3 py-3 sm:px-6"
      >
        <div className="mx-auto flex w-full max-w-3xl items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Ask about a concept, e.g. “What is a hash map?”"
            rows={1}
            disabled={isStreaming}
            className="max-h-40 min-h-[48px] w-full resize-none rounded-2xl border border-neutral-300 bg-neutral-50 px-4 py-3 text-[16px] leading-snug text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-500 focus:bg-white focus:ring-2 focus:ring-neutral-200 disabled:opacity-60"
          />

          {isStreaming ? (
            <button
              type="button"
              onClick={stop}
              className="h-12 shrink-0 rounded-2xl bg-red-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="h-12 shrink-0 rounded-2xl bg-neutral-900 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800 disabled:opacity-30"
            >
              Send
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Message: renders text parts as markdown and tool parts via <ToolCall />.   */
/* -------------------------------------------------------------------------- */
function Message({ message }: { message: Week5UIMessage }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[90%] rounded-2xl rounded-br-md bg-neutral-900 px-4 py-3 text-[15px] leading-7 text-white shadow-sm sm:max-w-[82%]">
          {message.parts.map((part, i) =>
            part.type === "text" ? <span key={i}>{part.text}</span> : null
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-xs font-bold text-white shadow-sm">
        S
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {message.parts.map((part, i) => {
          if (part.type === "text" && part.text.trim()) {
            return (
              <div
                key={i}
                className="max-w-[90%] rounded-2xl rounded-bl-md border border-neutral-200 bg-white px-4 py-3 text-[15px] leading-7 text-neutral-900 shadow-sm sm:max-w-[82%]"
              >
                <Markdown text={part.text} />
              </div>
            );
          }

          if (part.type === "tool-lookupConcept") {
            return <ToolCall key={part.toolCallId ?? i} part={part} />;
          }

          return null;
        })}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */
function Markdown({ text }: { text: string }) {
  return (
    <div className="space-y-2">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-semibold">{children}</strong>
          ),
          ul: ({ children }) => (
            <ul className="mb-2 list-disc space-y-1 pl-5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-2 list-decimal space-y-1 pl-5">{children}</ol>
          ),
          code: ({ children }) => (
            <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[13px]">
              {children}
            </code>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline underline-offset-2"
            >
              {children}
            </a>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="flex min-h-[55vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-900 text-2xl text-white shadow-lg">
        📖
      </div>
      <h2 className="text-2xl font-bold tracking-tight text-neutral-900">
        Ask about any concept
      </h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-neutral-500">
        StudyMate looks the term up with a live tool call, then explains it.
        Watch the tool card move through its states — including the error state.
      </p>

      <div className="mt-7 grid w-full max-w-xl gap-3 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => onPick(s.label.replace(/[“”]/g, ""))}
            className={[
              "rounded-2xl border p-4 text-left text-sm font-medium shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
              s.trigger
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-neutral-200 bg-white text-neutral-800",
            ].join(" ")}
          >
            <span className="mr-2 text-lg">{s.icon}</span>
            {s.label}
            {s.trigger && (
              <span className="mt-1 block text-[11px] font-normal text-red-500">
                triggers the designed error state
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function Thinking() {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-xs font-bold text-white">
        S
      </div>
      <div className="flex items-center gap-1.5 rounded-2xl border border-neutral-200 bg-white px-4 py-3 shadow-sm">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400 [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400 [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400" />
      </div>
    </div>
  );
}

/**
 * Designed error state for a failed request/stream (e.g. rate limit, network,
 * or an API/auth error) — as opposed to a tool's `output-error`, which renders
 * inside the message via <ToolCall />. Neither path is allowed to crash the UI.
 */
function ErrorBanner({
  message,
  onRetry,
  onDismiss,
}: {
  message: string;
  onRetry: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="shrink-0 border-t border-amber-200 bg-amber-50 px-3 py-2.5 sm:px-6">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
        <span aria-hidden className="text-base">
          ⚠️
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-amber-800">
            The assistant couldn’t respond
          </p>
          <p className="truncate text-xs text-amber-700" title={message}>
            {message || "Something went wrong. Please try again."}
          </p>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700"
        >
          Retry
        </button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded-lg px-2 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
