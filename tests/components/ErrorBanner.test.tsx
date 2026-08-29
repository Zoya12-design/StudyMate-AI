import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import ErrorBanner from "@/components/chat/ErrorBanner";

const copy = {
  title: "Too many requests",
  hint: "Wait about 30 seconds, then retry.",
};

describe("ErrorBanner", () => {
  it("renders actionable error copy and calls Retry", () => {
    const onRetry = vi.fn();
    render(
      <ErrorBanner
        copy={copy}
        retrying={false}
        onRetry={onRetry}
        onDismiss={vi.fn()}
      />
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Too many requests");
    expect(screen.getByText(copy.hint)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry this message" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("disables Retry while a retry is already in flight and supports Dismiss", () => {
    const onDismiss = vi.fn();
    render(
      <ErrorBanner
        copy={copy}
        retrying
        onRetry={vi.fn()}
        onDismiss={onDismiss}
      />
    );

    expect(screen.getByRole("button", { name: "Retrying…" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
