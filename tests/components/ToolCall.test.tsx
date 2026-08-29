import { render, screen } from "@testing-library/react";
import ToolCall from "@/components/week5/ToolCall";
import { describe, it, expect } from "vitest";

import type { ConceptToolPart } from "@/lib/week5-types";

const input = { term: "HTTP" };

function part(
  state: ConceptToolPart["state"],
  extra: Record<string, unknown> = {}
) {
  return {
    type: "tool-lookupConcept",
    toolCallId: "call-test",
    state,
    input,
    ...extra,
  } as ConceptToolPart;
}

describe("ToolCall state machine", () => {
  it("shows the forming-query state", () => {
    render(<ToolCall part={part("input-streaming")} />);

    expect(
      screen.getByText("Deciding what to look up")
    ).toBeInTheDocument();

    expect(screen.getByText(/forming query:/i)).toBeInTheDocument();

    // HTTP is inside quotation marks, so use a regex matcher.
    expect(screen.getByText(/HTTP/)).toBeInTheDocument();

    expect(screen.getByText("input-streaming")).toBeInTheDocument();
  });

  it("shows the dispatched input state", () => {
    render(<ToolCall part={part("input-available")} />);

    expect(screen.getByText("Looking up a concept")).toBeInTheDocument();

    expect(screen.getByText("term")).toBeInTheDocument();

    expect(screen.getByText("HTTP")).toBeInTheDocument();
  });

  it("renders the grounded result state", () => {
    render(
      <ToolCall
        part={part("output-available", {
          output: {
            term: "HTTP",
            title: "HTTP",
            summary: "A web protocol.",
            description: null,
            thumbnail: null,
            url: "https://en.wikipedia.org/wiki/HTTP",
            readingTimeMin: 1,
          },
        })}
      />
    );

    expect(
      screen.getByRole("heading", {
        level: 3,
        name: "HTTP",
      })
    ).toBeInTheDocument();

    expect(screen.getByText("A web protocol.")).toBeInTheDocument();

    expect(screen.getByText("output-available")).toBeInTheDocument();
  });

  it("renders a designed tool failure instead of crashing", () => {
    render(
      <ToolCall
        part={part("output-error", {
          errorText: "No encyclopedia entry found.",
        })}
      />
    );

    expect(
      screen.getByText("Couldn’t find that concept")
    ).toBeInTheDocument();

    // "No result for" is part of a larger paragraph.
    expect(screen.getByText(/No result for/)).toBeInTheDocument();

    // HTTP is wrapped with quotation marks.
    expect(screen.getByText(/HTTP/)).toBeInTheDocument();

    expect(
      screen.getByText("No encyclopedia entry found.")
    ).toBeInTheDocument();

    expect(screen.getByText("output-error")).toBeInTheDocument();
  });
});