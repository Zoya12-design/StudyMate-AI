import { test, expect } from "@playwright/test";

function mockChatStream(text: string) {
  const events = [
    { type: "start" },
    { type: "start-step" },
    { type: "text-start", id: "test-text-1" },
    { type: "text-delta", id: "test-text-1", delta: text },
    { type: "text-end", id: "test-text-1" },
    { type: "finish-step" },
    { type: "finish", finishReason: "stop" },
  ];

  return events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("");
}

test("primary chat flow sends a question and renders the streamed answer", async ({ page }) => {
  await page.route("**/api/chat", async (route) => {
    expect(route.request().method()).toBe("POST");
    await route.fulfill({
      status: 200,
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        "x-vercel-ai-ui-message-stream": "v1",
      },
      body: mockChatStream("Mocked answer from the test server."),
    });
  });

  await page.goto("/");

  const textbox = page.getByRole("textbox", { name: /Ask StudyMate AI anything/i });
  await textbox.fill("What is binary search?");
  await page.getByRole("button", { name: "Send" }).click();

  await expect(page.getByText("What is binary search?")).toBeVisible();
  await expect(page.getByText("Mocked answer from the test server.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Send" })).toBeVisible();
});
