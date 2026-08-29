import { render, screen } from "@testing-library/react";
import ConceptCard from "@/components/week5/ConceptCard";
import type { ConceptResult } from "@/lib/tools/lookup-concept";

const base: ConceptResult = {
  term: "HTTP",
  title: "HTTP",
  summary: "Hypertext Transfer Protocol is an application protocol for distributed information systems.",
  description: null,
  thumbnail: null,
  url: "https://en.wikipedia.org/wiki/HTTP",
  readingTimeMin: 1,
};

describe("ConceptCard", () => {
  it("renders a result and accessible source link when optional media is missing", () => {
    render(<ConceptCard data={base} />);

    expect(screen.getByRole("heading", { level: 3, name: "HTTP" })).toBeInTheDocument();
    expect(screen.getByText(base.summary)).toBeInTheDocument();
    expect(screen.getByText("H")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Read full article/ })).toHaveAttribute(
      "href",
      base.url
    );
  });

  it("renders the thumbnail and descriptor when the API provides them", () => {
    render(
      <ConceptCard
        data={{
          ...base,
          description: "Web protocol",
          thumbnail: "https://example.com/http.png",
        }}
      />
    );

    expect(screen.getByRole("img", { name: "HTTP" })).toHaveAttribute(
      "src",
      "https://example.com/http.png"
    );
    expect(screen.getByText(/Web protocol/i)).toBeInTheDocument();
  });
});
