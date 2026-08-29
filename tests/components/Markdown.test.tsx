import { render, screen } from "@testing-library/react";
import Markdown from "@/components/chat/Markdown";

describe("Markdown", () => {
  it("renders common assistant markdown semantics instead of raw markup", () => {
    render(<Markdown text={"## Study\n\n**Binary search** uses a sorted list.\n\n- Fast\n- Ordered"} />);

    expect(screen.getByRole("heading", { level: 2, name: "Study" })).toBeInTheDocument();
    expect(screen.getByText("Binary search")).toHaveClass("font-bold");
    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.getByText("Fast")).toBeInTheDocument();
  });

  it("renders links with safe external-link attributes", () => {
    render(<Markdown text={'Read [the docs](https://example.com/docs).'} />);

    const link = screen.getByRole("link", { name: "the docs" });
    expect(link).toHaveAttribute("href", "https://example.com/docs");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});
