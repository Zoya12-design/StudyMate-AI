"use client";

/**
 * FL-07 — Checkpoint agent UI.
 *
 * Deliberately thinner than ChatInterface: this is an agent console, so the
 * tool calls are first-class furniture, not a detail. Every call renders as a
 * card with its raw input and output openable underneath, because "at least one
 * live tool connection in use" has to be *visible* in the run capture, not
 * something a reviewer takes on trust.
 *
 * Reused from FE-08 rather than rebuilt: <Markdown>, <ErrorBanner>,
 * <AssistantSkeleton>, and describeError().
 */

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AssistantSkeleton from "@/components/chat/AssistantSkeleton";
import ErrorBanner from "@/components/chat/ErrorBanner";
import Markdown from "@/components/chat/Markdown";
import { describeError } from "@/lib/failure-modes";
import type { CheckpointUIMessage } from "@/lib/agent/prompt";

const MAX_CHARS = 20000;

const TOOL_META: Record<string, { icon: string; label: string }> = {
  "tool-getChecklist": { icon: "📋", label: "Reading the saved checklist" },
  "tool-saveChecklist": { icon: "💾", label: "Saving the checklist" },
  "tool-markItems": { icon: "✅", label: "Ticking items off" },
  "tool-listProjectFiles": { icon: "📁", label: "Checking the project folder" },
};

const STARTERS = [
  "What do I still have to do on FE-08?",
  "Show me every assignment you have saved.",
  "I finished the week-06 page — check it.",
];

/** One-line plain-words summary of a tool result, keyed off its `kind`. */
function summarise(output: unknown): string | null {
  if (!output || typeof output !== "object") return null;
  const o = output as Record<string, unknown>;
  const kind = typeof o.kind === "string" ? o.kind : "";

  switch (kind) {
    case "list":
      return `${o.count} assignment(s) on file`;
    case "found":
      return `${o.code} — ${o.requiredRemaining} required item(s) still open`;
    case "missing":
      return `Nothing saved for ${o.code}`;
    case "saved":
      return `${o.overwrite ? "Overwrote" : "Saved"} ${o.code} — ${o.required} required, ${o.optional} optional`;
    case "needs-confirmation":
      return `Blocked: ${o.code} already exists — waiting for a yes`;
    case "marked":
      return `Changed ${(o.changed as number[] | undefined)?.length ?? 0} item(s) — ${o.requiredRemaining} still open`;
    case "listed": {
      const files = (o.files as string[] | undefined)?.length ?? 0;
      const folders = (o.folders as string[] | undefined)?.length ?? 0;
      return `${o.folder} — ${files} file(s), ${folders} folder(s)`;
    }
    case "not-found":
      return `${o.folder} does not exist`;
    case "refused":
      return `Refused: ${o.folder} is outside the allowed folders`;
    default:
      return null;
  }
}

function messageText(message: CheckpointUIMessage | undefined): string {
  if (!message) return "";
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();
}

export default function AgentChat() {
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/agent" }),
    []
  );

  const {
    messages,
    sendMessage,
    status,
    stop,
    setMessages,
    error,
    clearError,
    regenerate,
  } = useChat<CheckpointUIMessage>({ transport });

  const [input, setInput] = useState("");
  const [retrying, setRetrying] = useState(false);
  const [pinned, setPinned] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // A ref, not state: two clicks in the same tick both read the pre-update
  // value of a useState guard, which is how FE-08's double-retry bug happened.
  const inFlight = useRef(false);

  const isStreaming = status === "streaming" || status === "submitted";
  const isWaiting = status === "submitted";
  const trimmed = input.trim();
  const tooLong = input.length > MAX_CHARS;
  const canSend = trimmed.length > 0 && !tooLong && !isStreaming;

  useEffect(() => {
    if (pinned) bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages, isWaiting, pinned]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  }, [input]);

  const send = useCallback(
    async (text: string) => {
      const value = text.trim();
      if (!value || value.length > MAX_CHARS || isStreaming) return;
      if (inFlight.current) return;
      inFlight.current = true;
      clearError();
      setInput("");
      setPinned(true);
      try {
        await sendMessage({ text: value });
      } catch {
        // Surfaced by `error` from useChat; nothing to do here.
      } finally {
        inFlight.current = false;
      }
    },
    [clearError, isStreaming, sendMessage]
  );

  const retry = useCallback(async () => {
    if (isStreaming || inFlight.current) return;
    inFlight.current = true;
    setRetrying(true);
    clearError();
    try {
      await regenerate();
    } catch {
      // Same as above.
    } finally {
      inFlight.current = false;
      setRetrying(false);
    }
  }, [clearError, isStreaming, regenerate]);

  const lastMessage = messages[messages.length - 1];
  const incomplete =
    Boolean(error) &&
    lastMessage?.role === "assistant" &&
    messageText(lastMessage).length > 0;

  return (
    <div className="flex h-dvh flex-col bg-[#faf9f7] text-neutral-900">
      <header className="shrink-0 border-b border-neutral-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-3 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-neutral-900 text-base text-white"
            >
              ✓
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold sm:text-base">
                Checkpoint
              </h1>
              <p className="text-xs text-neutral-500">
                FL-07 · submission coach agent
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/"
              className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold shadow-sm transition hover:bg-neutral-50 sm:text-sm"
            >
              ← Chat
            </Link>
            <button
              type="button"
              onClick={() => {
                stop();
                clearError();
                setMessages([]);
                setInput("");
                setPinned(true);
              }}
              className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold shadow-sm transition hover:bg-neutral-50 sm:text-sm"
            >
              Reset
            </button>
          </div>
        </div>
      </header>

      <div
        ref={scrollRef}
        onScroll={(event) => {
          const el = event.currentTarget;
          setPinned(el.scrollHeight - el.scrollTop - el.clientHeight < 120);
        }}
        className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-5 sm:px-6"
      >
        <div className="mx-auto w-full max-w-3xl space-y-4">
          {messages.length === 0 ? (
            <EmptyState onPick={(text) => void send(text)} />
          ) : (
            messages.map((message) => (
              <MessageRow
                key={message.id}
                message={message}
                incomplete={incomplete && message.id === lastMessage?.id}
              />
            ))
          )}

          {isWaiting && <AssistantSkeleton slow={false} />}
          <div ref={bottomRef} className="h-px" />
        </div>
      </div>

      {error && (
        <div className="mx-auto w-full max-w-3xl px-3 sm:px-6">
          <ErrorBanner
            copy={describeError(error, { truncated: incomplete })}
            retrying={retrying}
            onRetry={() => void retry()}
            onDismiss={clearError}
          />
        </div>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void send(input);
        }}
        className="shrink-0 border-t border-neutral-200 bg-white px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6"
      >
        <div className="mx-auto w-full max-w-3xl">
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                // Enter sends, Shift+Enter makes a newline — but a pasted brief
                // is multi-line, so the textarea stays the primary affordance.
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send(input);
                }
              }}
              disabled={isStreaming}
              aria-invalid={tooLong}
              placeholder="Paste an assignment brief, or ask what is left…"
              rows={2}
              className={[
                "max-h-60 min-h-[72px] w-full resize-none rounded-2xl border bg-neutral-50 px-4 py-3 text-[16px] leading-snug outline-none transition placeholder:text-neutral-400 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60",
                tooLong
                  ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                  : "border-neutral-300 focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200",
              ].join(" ")}
            />

            {isStreaming ? (
              <button
                type="button"
                onClick={() => stop()}
                className="h-12 shrink-0 rounded-2xl border border-neutral-300 bg-white px-4 text-sm font-semibold shadow-sm transition hover:bg-neutral-50"
              >
                Stop
              </button>
            ) : (
              <button
                type="submit"
                disabled={!canSend}
                className="h-12 shrink-0 rounded-2xl bg-neutral-900 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
              >
                Send
              </button>
            )}
          </div>

          <p className="mt-2 text-[11px] text-neutral-500">
            {tooLong ? (
              <span className="font-semibold text-red-600">
                {input.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}{" "}
                characters — too long to send.
              </span>
            ) : (
              "Enter sends · Shift+Enter for a new line · checklists are saved to data/assignments.json"
            )}
          </p>
        </div>
      </form>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-base font-bold sm:text-lg">
        Paste a brief, get a checklist
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-neutral-600">
        I turn a FlyRank assignment brief into an exact list of what you have to
        hand in, quoting the line each item came from. Then I check your work
        against it and tell you what is still missing. I save each checklist to a
        file, so you can come back to it next week.
      </p>
      <p className="mt-2 text-sm leading-relaxed text-neutral-600">
        I cannot see the portal, so I never submit anything for you — I hand you
        the text to paste.
      </p>

      <div className="mt-4 space-y-2">
        {STARTERS.map((starter) => (
          <button
            key={starter}
            type="button"
            onClick={() => onPick(starter)}
            className="block w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-left text-sm font-medium transition hover:border-neutral-300 hover:bg-white"
          >
            {starter}
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageRow({
  message,
  incomplete,
}: {
  message: CheckpointUIMessage;
  incomplete: boolean;
}) {
  const isUser = message.role === "user";

  if (isUser) {
    const text = messageText(message);
    const long = text.length > 600;
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-neutral-900 px-4 py-3 text-sm leading-relaxed text-white shadow-sm">
          {long ? (
            <details>
              <summary className="cursor-pointer font-semibold">
                Pasted {text.length.toLocaleString()} characters — tap to expand
              </summary>
              <p className="mt-2 whitespace-pre-wrap text-[13px] opacity-90">
                {text}
              </p>
            </details>
          ) : (
            <p className="whitespace-pre-wrap">{text}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <span
        aria-hidden
        className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-neutral-900 text-sm text-white"
      >
        ✓
      </span>

      <div className="min-w-0 flex-1 space-y-2">
        {message.parts.map((part, index) => {
          if (part.type === "text") {
            if (!part.text.trim()) return null;
            return (
              <div
                key={index}
                className="rounded-2xl rounded-bl-md border border-neutral-200 bg-white px-4 py-3 text-sm leading-7 shadow-sm"
              >
                <Markdown text={part.text} />
              </div>
            );
          }

          if (part.type.startsWith("tool-")) {
            return <ToolCard key={index} part={part} />;
          }

          return null;
        })}

        {incomplete && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
            ⚠️ This answer was cut off — retry below to get the rest.
          </p>
        )}
      </div>
    </div>
  );
}

function ToolCard({ part }: { part: { type: string } & Record<string, unknown> }) {
  const meta = TOOL_META[part.type] ?? { icon: "🔧", label: part.type };
  const state = typeof part.state === "string" ? part.state : "";
  const running = state === "input-streaming" || state === "input-available";
  const failed = state === "output-error";
  const summary = summarise(part.output);

  return (
    <div
      className={[
        "fe07-tool-in rounded-2xl border px-3.5 py-3 text-sm shadow-sm",
        failed
          ? "border-red-200 bg-red-50"
          : "border-neutral-200 bg-white",
      ].join(" ")}
    >
      <div className="flex items-center gap-2">
        <span aria-hidden>{meta.icon}</span>
        <span className="font-semibold">{meta.label}</span>
        <span
          className={[
            "ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            failed
              ? "bg-red-100 text-red-700"
              : running
                ? "bg-amber-100 text-amber-800 fe07-pulse"
                : "bg-green-100 text-green-700",
          ].join(" ")}
        >
          {failed ? "error" : running ? "running" : "done"}
        </span>
      </div>

      {summary && (
        <p className="mt-1.5 text-[13px] text-neutral-700">{summary}</p>
      )}

      {failed && typeof part.errorText === "string" && (
        <p className="mt-1.5 text-[13px] text-red-700">{part.errorText}</p>
      )}

      {Boolean(part.input || part.output) && (
        <details className="mt-2">
          <summary className="cursor-pointer text-[11px] font-semibold text-neutral-500">
            Raw tool call
          </summary>
          <pre className="mt-1.5 max-h-64 overflow-auto rounded-lg bg-neutral-900 px-3 py-2 text-[11px] leading-relaxed text-neutral-100">
            {JSON.stringify(
              { input: part.input, output: part.output },
              null,
              2
            )}
          </pre>
        </details>
      )}
    </div>
  );
}
