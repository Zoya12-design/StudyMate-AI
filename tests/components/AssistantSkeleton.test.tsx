import { render, screen } from "@testing-library/react";
import AssistantSkeleton from "@/components/chat/AssistantSkeleton";

describe("AssistantSkeleton", () => {
  it("announces that StudyMate is writing while the response is pending", () => {
    render(<AssistantSkeleton slow={false} />);

    expect(screen.getByText("StudyMate is writing a reply.")).toBeInTheDocument();
    expect(screen.queryByText(/Still working/)).not.toBeInTheDocument();
  });

  it("explains a slow first token without replacing the loading geometry", () => {
    render(<AssistantSkeleton slow />);

    expect(screen.getByText(/Still working — the free model/)).toBeInTheDocument();
    expect(screen.getByText(/You can press Stop at any time/)).toBeInTheDocument();
  });
});
