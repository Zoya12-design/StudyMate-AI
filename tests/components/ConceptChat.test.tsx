import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Week5UIMessage } from "@/lib/week5-types";
import { Message } from "@/components/week5/ConceptChat";

vi.mock("@ai-sdk/react", () => ({ useChat: vi.fn() }));
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

function message(parts: unknown[], role: "user" | "assistant" = "assistant") {
  return {
    id: `message-${role}`,
    role,
    parts,
  } as Week5UIMessage;
}

describe("ConceptChat Message renderer", () => {
  it("renders user text parts", () => {
    render(<Message message={message([{ type: "text", text: "What is HTTP?" }], "user")} />);

    expect(screen.getByText("What is HTTP?")).toBeInTheDocument();
  });

  it("renders assistant text parts as markdown", () => {
    render(<Message message={message([{ type: "text", text: "**HTTP** is a protocol." }])} />);

    expect(screen.getByText("HTTP", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByText("is a protocol.")).toBeInTheDocument();
  });

  it("renders tool parts through the ToolCall renderer", () => {
    render(
      <Message
        message={message([
          {
            type: "tool-lookupConcept",
            toolCallId: "call-1",
            state: "input-streaming",
            input: { term: "HTTP" },
          },
        ])}
      />
    );
    
expect(screen.getByText("Deciding what to look up")).toBeInTheDocument();
expect(screen.getByText(/forming query:/i)).toBeInTheDocument();
expect(screen.getByText(/HTTP/)).toBeInTheDocument();
  });
});
