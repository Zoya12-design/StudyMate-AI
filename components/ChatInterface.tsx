"use client";

/**
 * StudyMate AI — the primary flow: type a question, watch the answer stream in.
 *
 * FE-06 built the streaming spine (useChat, message parts, stop, scroll-aware
 * autoscroll). FE-08 hardened it, so every state below is one a real student can
 * actually reach:
 *
 *   offline            → composer locks, typed text is preserved, banner explains
 *   request failed     → designed banner naming the cause + single-flight Retry
 *   stream cut short   → the partial answer stays, flagged incomplete, retryable
 *   waiting            → skeleton shaped like the answer (no layout shift)
 *   slow               → a "still working" note so a stall never looks frozen
 *   empty response     → an explicit card, never a silent blank bubble
 *   empty input        → send is impossible, so no empty request is ever made
 *   over-long input    → blocked with a live counter before the API rejects it
 *   nothing yet        → onboarding empty state with questions that send on tap
 *
 * `failureLab` mounts the sabotage controls (/week-06 only) so each of those can
 * be triggered on the deployed URL.
 */

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { describeError, type FailureId } from "@/lib/failure-modes";
import AssistantSkeleton from "./chat/AssistantSkeleton";
import ErrorBanner from "./chat/ErrorBanner";
import FailureLab from "./chat/FailureLab";
import Markdown from "./chat/Markdown";

/** Matches the server-side guard in app/api/chat/route.ts. */
const MAX_CHARS = 2000;

/**
 * Empty-state starters. Real questions that send on tap — an empty state should
 * teach what the product is for, not just describe it.
 */
const STARTERS = [
  {
    icon: "📚",
    title: "Explain a concept",
    prompt: "Explain binary search trees in simple words with a small example.",
  },
  {
    icon: "🧠",
    title: "Prep for an exam",
    prompt:
      "Give me a 5-point revision sheet on photosynthesis for a school exam.",
  },
  {
    icon: "💻",
    title: "Debug my thinking",
    prompt: "Why does a Python for-loop over a list I am editing skip items?",
  },
];

function messageText(message: UIMessage): string {
  return (message.parts ?? [])
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();
}

export default function ChatInterface({
  failureLab = false,
}: {
  failureLab?: boolean;
}) {
  // Built once: a fresh transport on every render would throw away in-flight
  // request state.
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat" }),
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
  } = useChat({ transport });

  const [input, setInput] = useState("");
  const [pinnedToBottom, setPinnedToBottom] = useState(true);

  // FE-08 state
  const [retrying, setRetrying] = useState(false);
  const [stoppedByUser, setStoppedByUser] = useState(false);
  const [slow, setSlow] = useState(false);
  const [online, setOnline] = useState(true);
  const [emptyNoticeDismissed, setEmptyNoticeDismissed] = useState(false);

  // Failure lab
  const [armed, setArmed] = useState<FailureId | null>(null);
  const [forcedOffline, setForcedOffline] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /**
   * Single-flight lock for send/retry.
   *
   * A ref, not state, on purpose: two clicks in the same tick both read the
   * pre-update value of any `useState` guard (React batches the update), so a
   * fast double tap fires two requests and the conversation gets two answers to
   * one question. A ref is written synchronously, so the second click sees the
   * lock. `disabled` on the button is the visual half of this; the ref is the
   * half that actually holds.
   */
  const inFlight = useRef(false);

  const isStreaming = status === "streaming" || status === "submitted";
  const isWaiting = status === "submitted";
  const offline = forcedOffline || !online;

  const trimmed = input.trim();
  const tooLong = input.length > MAX_CHARS;
  const canSend = trimmed.length > 0 && !tooLong && !isStreaming && !offline;

  // ------------------------------------------------------------------
  // Offline detection. Starts optimistic so the server and the first
  // client render agree, then syncs to the real value.
  // ------------------------------------------------------------------

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);

    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);

    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  // ------------------------------------------------------------------
  // A wait longer than ~4s needs an explanation, not just a skeleton.
  // ------------------------------------------------------------------

  useEffect(() => {
    if (!isWaiting) {
      setSlow(false);
      return;
    }

    const timer = setTimeout(() => setSlow(true), 4000);
    return () => clearTimeout(timer);
  }, [isWaiting]);

  // ------------------------------------------------------------------
  // Scroll: stay pinned only while the user is already near the bottom.
  // ------------------------------------------------------------------

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;

    const distanceFromBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight;

    setPinnedToBottom(distanceFromBottom < 48);
  };

  useEffect(() => {
    if (pinnedToBottom) {
      bottomRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
    }
  }, [messages, pinnedToBottom, isWaiting]);

  // ------------------------------------------------------------------
  // iOS Safari: the on-screen keyboard shrinks the visual viewport rather
  // than the layout, which parks the newest message behind the keyboard.
  // Re-anchor whenever the viewport resizes.
  // ------------------------------------------------------------------

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const reanchor = () => {
      if (pinnedToBottom) {
        bottomRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
      }
    };

    viewport.addEventListener("resize", reanchor);
    return () => viewport.removeEventListener("resize", reanchor);
  }, [pinnedToBottom]);

  // ------------------------------------------------------------------
  // Composer grows with its content instead of scrolling inside itself.
  // ------------------------------------------------------------------

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  // ------------------------------------------------------------------
  // Send
  // ------------------------------------------------------------------

  const send = useCallback(
    async (text: string) => {
      const value = text.trim();

      // Guard rails, in order: empty input, over-long input, a request already
      // in flight, and no connection. None of these should reach the API.
      if (!value || value.length > MAX_CHARS || isStreaming || offline) return;
      if (inFlight.current) return;

      inFlight.current = true;

      // A simulation is one-shot: it arms the next request and then disarms, so
      // a Retry afterwards runs for real.
      const simulate = armed;
      setArmed(null);

      setStoppedByUser(false);
      setEmptyNoticeDismissed(false);
      clearError();
      setInput("");
      setPinnedToBottom(true);

      try {
        await sendMessage(
          { text: value },
          simulate ? { body: { simulate } } : undefined
        );
      } catch {
        // The hook records the failure in `error`; the banner renders it.
      } finally {
        inFlight.current = false;
      }
    },
    [armed, clearError, isStreaming, offline, sendMessage]
  );

  // ------------------------------------------------------------------
  // Retry — the failed turn only, and only once per tap.
  // ------------------------------------------------------------------

  const retry = useCallback(async () => {
    if (isStreaming) return;
    if (inFlight.current) return;

    inFlight.current = true;
    setRetrying(true);
    setStoppedByUser(false);
    setEmptyNoticeDismissed(false);
    clearError();

    try {
      // No messageId: regenerate() drops the failed assistant turn, or re-sends
      // the trailing user turn if the request died before one existed. Either
      // way it replays that one exchange, not the whole conversation.
      await regenerate();
    } catch {
      // The hook puts the failure back into `error`; the banner handles it.
    } finally {
      inFlight.current = false;
      setRetrying(false);
    }
  }, [clearError, isStreaming, regenerate]);

  // ------------------------------------------------------------------
  // New chat
  // ------------------------------------------------------------------

  const handleNewChat = () => {
    if (isStreaming) void stop();

    setMessages([]);
    setInput("");
    setPinnedToBottom(true);
    setStoppedByUser(false);
    setEmptyNoticeDismissed(false);
    clearError();

    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  const handleStop = () => {
    setStoppedByUser(true);
    void stop();
  };

  // ------------------------------------------------------------------
  // Derived states
  // ------------------------------------------------------------------

  const lastMessage = messages[messages.length - 1];

  /**
   * The stream finished cleanly but produced nothing. Rendering that as an empty
   * bubble looks like a hang, so it gets its own state. A user-initiated stop is
   * excluded — that is a choice, not a failure.
   */
  const emptyResponse =
    status === "ready" &&
    !error &&
    !stoppedByUser &&
    !emptyNoticeDismissed &&
    messages.length > 0 &&
    (lastMessage.role === "user" || !messageText(lastMessage));

  /** A stream that died partway leaves a truncated assistant message behind. */
  const incompleteMessageId =
    error && lastMessage?.role === "assistant" && messageText(lastMessage)
      ? lastMessage.id
      : null;

  return (
    <div className="flex h-dvh w-full flex-col bg-[#faf9f7]">
      {/* ================= HEADER ================= */}

      <header className="shrink-0 border-b border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-lg text-white shadow-sm">
              S
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold text-neutral-900 sm:text-base">
                StudyMate AI
              </h1>

              <div className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className={`h-2 w-2 rounded-full ${
                    offline ? "bg-neutral-400" : "bg-green-500"
                  }`}
                />

                <span className="text-xs text-neutral-500">
                  {offline
                    ? "Offline"
                    : failureLab
                      ? "FE-08 · Reliability lab"
                      : "AI Study Assistant"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {failureLab ? (
              <Link
                href="/"
                className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-800 shadow-sm transition hover:bg-neutral-50 sm:text-sm"
              >
                ← Chat
              </Link>
            ) : (
              <>
                <Link
                  href="/week-05"
                  className="hidden rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-800 shadow-sm transition hover:bg-neutral-50 sm:block"
                >
                  Concept lookup
                </Link>

                {/* The lab is the only way to reach the handled failure states
                    on a deployed build, so it needs a route in from the chat —
                    kept visible at phone width too, unlike the link above. */}
                <Link
                  href="/week-06"
                  title="FE-08 — trigger a handled failure"
                  className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-800 shadow-sm transition hover:bg-neutral-50 sm:text-sm"
                >
                  <span className="sm:hidden">Lab</span>
                  <span className="hidden sm:inline">Reliability lab</span>
                </Link>
              </>
            )}

            <button
              type="button"
              onClick={handleNewChat}
              title="Start a new chat"
              className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-800 shadow-sm transition hover:border-neutral-300 hover:bg-neutral-50 active:bg-neutral-100 sm:px-4 sm:text-sm"
            >
              <span aria-hidden className="mr-1">
                ＋
              </span>
              New
              <span className="hidden sm:inline"> Chat</span>
            </button>
          </div>
        </div>
      </header>

      {/* ================= FAILURE LAB (/week-06 only) ================= */}

      {failureLab && (
        <FailureLab
          armed={armed}
          onArm={setArmed}
          forcedOffline={forcedOffline}
          onToggleOffline={setForcedOffline}
        />
      )}

      {/* ================= OFFLINE BANNER ================= */}

      {offline && (
        <div
          role="status"
          className="shrink-0 border-b border-neutral-300 bg-neutral-100 px-3 py-2.5 sm:px-6"
        >
          <div className="mx-auto flex w-full max-w-3xl items-center gap-2.5">
            <span aria-hidden>📴</span>

            <p className="text-xs leading-4 text-neutral-700">
              <span className="font-semibold">You are offline.</span> Sending is
              paused — anything you have typed is saved and will send once you
              reconnect.
            </p>
          </div>
        </div>
      )}

      {/* ================= MESSAGES ================= */}

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-5 sm:px-6"
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
          {messages.length === 0 && (
            <EmptyState offline={offline} onPick={send} />
          )}

          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              incomplete={message.id === incompleteMessageId}
            />
          ))}

          {isWaiting && <AssistantSkeleton slow={slow} />}

          {emptyResponse && (
            <NoAnswerCard
              retrying={retrying}
              onRetry={retry}
              onDismiss={() => setEmptyNoticeDismissed(true)}
            />
          )}

          <div ref={bottomRef} />
        </div>

        {!pinnedToBottom && messages.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setPinnedToBottom(true);
              bottomRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "end",
              });
            }}
            className="sticky bottom-4 left-1/2 mx-auto block -translate-x-1/2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold text-neutral-800 shadow-lg transition hover:bg-neutral-50"
          >
            ↓ Jump to latest
          </button>
        )}
      </div>

      {/* ================= ERROR STATE ================= */}

      {error && (
        <ErrorBanner
          copy={describeError(error, { truncated: incompleteMessageId !== null })}
          retrying={retrying}
          onRetry={retry}
          onDismiss={clearError}
        />
      )}

      {/* ================= COMPOSER ================= */}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void send(input);
        }}
        className="shrink-0 border-t border-neutral-200 bg-white px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6"
      >
        <div className="mx-auto flex w-full max-w-3xl items-end gap-2">
          <div className="relative min-w-0 flex-1">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send(input);
                }
              }}
              placeholder={
                offline
                  ? "Offline — type now, send when you reconnect"
                  : "Ask StudyMate AI anything..."
              }
              rows={1}
              inputMode="text"
              aria-label="Ask StudyMate AI anything"
              aria-invalid={tooLong}
              // Not disabled while offline on purpose: the student can keep
              // typing, and the text survives until the connection returns.
              disabled={isStreaming}
              className={[
                "max-h-40 min-h-[48px] w-full resize-none rounded-2xl border bg-neutral-50 px-4 py-3 text-[16px] leading-snug text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60",
                tooLong
                  ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                  : "border-neutral-300 focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200",
              ].join(" ")}
            />
          </div>

          {isStreaming ? (
            <button
              type="button"
              onClick={handleStop}
              className="h-12 shrink-0 rounded-2xl bg-red-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 active:bg-red-800"
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!canSend}
              className="h-12 shrink-0 rounded-2xl bg-neutral-900 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800 active:bg-neutral-950 disabled:cursor-not-allowed disabled:bg-neutral-600 disabled:text-white"
            >
              Send
            </button>
          )}
        </div>

        <div className="mx-auto mt-2 flex w-full max-w-3xl items-center justify-between gap-3">
          <p className="hidden text-[11px] text-neutral-500 sm:block">
            Enter to send • Shift + Enter for a new line
          </p>

          {/* Only appears once the limit is actually in play. */}
          {input.length > MAX_CHARS * 0.8 && (
            <p
              className={`ml-auto text-[11px] font-medium ${
                tooLong ? "text-red-600" : "text-neutral-400"
              }`}
            >
              {input.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
              {tooLong && " — too long to send"}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}

/* ========================================================================== */
/* Empty state — onboarding, not decoration.                                  */
/* ========================================================================== */

function EmptyState({
  offline,
  onPick,
}: {
  offline: boolean;
  onPick: (text: string) => void;
}) {
  return (
    <div className="flex min-h-[55vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-900 text-2xl text-white shadow-lg">
        S
      </div>

      <h2 className="text-2xl font-bold tracking-tight text-neutral-900">
        No conversations yet
      </h2>

      <p className="mt-2 max-w-md text-sm leading-6 text-neutral-500">
        {offline
          ? "You are offline right now. Pick a question anyway — it will be waiting in the box when your connection is back."
          : "Tap one of these to see how it works, or ask your own question about any topic you are studying."}
      </p>

      <div className="mt-7 grid w-full max-w-xl gap-3 sm:grid-cols-3">
        {STARTERS.map((starter) => (
          <button
            key={starter.title}
            type="button"
            onClick={() => onPick(starter.prompt)}
            className="rounded-2xl border border-neutral-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-md active:translate-y-0"
          >
            <div aria-hidden className="text-xl">
              {starter.icon}
            </div>

            <div className="mt-2 text-xs font-semibold text-neutral-800">
              {starter.title}
            </div>

            <div className="mt-1 text-[11px] leading-4 text-neutral-500">
              {starter.prompt}
            </div>
          </button>
        ))}
      </div>

      <Link
        href="/week-05"
        className="mt-6 text-xs font-semibold text-neutral-500 underline underline-offset-4 transition hover:text-neutral-800"
      >
        Or look a single concept up with a tool call →
      </Link>
    </div>
  );
}

/* ========================================================================== */
/* Empty result — the request worked but there was nothing to show.           */
/* ========================================================================== */

function NoAnswerCard({
  retrying,
  onRetry,
  onDismiss,
}: {
  retrying: boolean;
  onRetry: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white text-xs font-bold text-neutral-400">
        S
      </div>

      <div className="max-w-[90%] rounded-2xl rounded-bl-md border border-dashed border-neutral-300 bg-white px-4 py-3 shadow-sm sm:max-w-[82%]">
        <p className="text-sm font-semibold text-neutral-900">
          No answer came back
        </p>

        <p className="mt-1 text-xs leading-5 text-neutral-500">
          The request finished but the model returned nothing at all. Your
          question is still in the conversation — a retry almost always fixes it.
        </p>

        <div className="mt-2.5 flex items-center gap-2">
          <button
            type="button"
            onClick={onRetry}
            disabled={retrying}
            className="h-9 rounded-xl bg-neutral-900 px-4 text-xs font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {retrying ? "Retrying…" : "Retry this message"}
          </button>

          <button
            type="button"
            onClick={onDismiss}
            className="h-9 rounded-xl px-3 text-xs font-semibold text-neutral-500 transition hover:bg-neutral-100"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================== */
/* Message bubble                                                             */
/* ========================================================================== */

export function MessageBubble({
  message,
  incomplete,
}: {
  message: UIMessage;
  incomplete: boolean;
}) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex items-start gap-3 ${
        isUser ? "justify-end" : "justify-start"
      }`}
    >
      {!isUser && (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-xs font-bold text-white shadow-sm">
          S
        </div>
      )}

      <div className="min-w-0">
        <div
          className={[
            "max-w-[90%] rounded-2xl px-4 py-3 text-[15px] leading-7 shadow-sm sm:max-w-[82%]",
            "break-words",
            isUser
              ? "ml-auto rounded-br-md bg-neutral-900 text-white"
              : "rounded-bl-md border border-neutral-200 bg-white text-neutral-900",
          ].join(" ")}
        >
          {(message.parts ?? []).map((part, index) =>
            part.type === "text" ? (
              <Markdown key={`${message.id}-${index}`} text={part.text} />
            ) : null
          )}
        </div>

        {/* A truncated answer says so, rather than pretending to be finished. */}
        {incomplete && (
          <p className="mt-1.5 text-[11px] font-medium text-amber-700">
            ⚠️ This answer was cut off — retry below to get the rest.
          </p>
        )}
      </div>
    </div>
  );
}
