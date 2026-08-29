import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UIMessage } from "ai";

const {
  useChatMock,
  regenerateMock,
  clearErrorMock,
  stopMock,
  sendMessageMock,
  setMessagesMock,
} = vi.hoisted(() => ({
  useChatMock: vi.fn(),
  regenerateMock: vi.fn(() => Promise.resolve()),
  clearErrorMock: vi.fn(),
  stopMock: vi.fn(() => Promise.resolve()),
  sendMessageMock: vi.fn(() => Promise.resolve()),
  setMessagesMock: vi.fn(),
}));

vi.mock("@ai-sdk/react", () => ({
  useChat: useChatMock,
}));

vi.mock("ai", () => ({
  DefaultChatTransport: class DefaultChatTransport {
    constructor(public options: unknown) {}
  },
}));

vi.mock("next/link", () => ({
  default: ({ children, ...props }: { children: React.ReactNode }) => (
    <a {...props}>{children}</a>
  ),
}));

import ChatInterface from "@/components/ChatInterface";

const assistantMessage = (text: string): UIMessage =>
  ({ id: "assistant-1", role: "assistant", parts: [{ type: "text", text }] }) as UIMessage;

function mockChat(overrides: Record<string, unknown> = {}) {
  useChatMock.mockReturnValue({
    messages: [],
    sendMessage: sendMessageMock,
    status: "ready",
    stop: stopMock,
    setMessages: setMessagesMock,
    error: undefined,
    clearError: clearErrorMock,
    regenerate: regenerateMock,
    ...overrides,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockChat();
});

describe("ChatInterface states", () => {
  it("shows the pending/loading state while the request is submitted", () => {
    mockChat({ status: "submitted" });
    render(<ChatInterface />);

    expect(screen.getByText("StudyMate is writing a reply.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stop" })).toBeInTheDocument();
  });

  it("shows the streaming answer and keeps Stop available", () => {
    mockChat({
      status: "streaming",
      messages: [assistantMessage("A streamed answer is arriving.")],
    });
    render(<ChatInterface />);

    expect(screen.getByText("A streamed answer is arriving.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stop" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /Ask StudyMate AI anything/i })).toBeDisabled();
  });

  it("shows the designed error state and retries only the failed turn", () => {
    mockChat({ error: new Error("429 rate limit reached") });
    render(<ChatInterface />);

    expect(screen.getByRole("alert")).toHaveTextContent("Too many requests");
    fireEvent.click(screen.getByRole("button", { name: "Retry this message" }));
    expect(clearErrorMock).toHaveBeenCalledTimes(1);
    expect(regenerateMock).toHaveBeenCalledTimes(1);
  });

  it("blocks an empty submission through the accessible form control", () => {
    render(<ChatInterface />);

    const send = screen.getByRole("button", { name: "Send" });
    expect(send).toBeDisabled();
  });

  it("blocks an over-long message before it can reach the AI transport", () => {
    render(<ChatInterface />);

    const textbox = screen.getByRole("textbox", { name: /Ask StudyMate AI anything/i });
    fireEvent.change(textbox, { target: { value: "x".repeat(2001) } });

    expect(screen.getByText(/2,001 \/ 2,000/)).toBeInTheDocument();
    expect(screen.getByText(/too long to send/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
    expect(sendMessageMock).not.toHaveBeenCalled();
  });
});
