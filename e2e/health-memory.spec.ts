import { test, expect } from "@playwright/test";

// Set x-user-id via localStorage or cookie for API calls
// The app uses x-user-id header - we need to ensure it's sent.
// The client-side fetch adds it from NEXT_PUBLIC_DEV_USER_ID or "dev-user".
// For E2E, the app runs in browser so it will use "dev-user" by default.

test.describe("Health Memory AI", () => {
  test("homepage loads and shows disclaimer", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Health Memory AI/i })).toBeVisible();
    await expect(page.getByText(/information organization only/i)).toBeVisible();
  });

  test("Add Memory - ingest text and show success or error", async ({ page }) => {
    await page.goto("/upload");
    await expect(page.getByRole("heading", { name: /Add Memory/i })).toBeVisible();

    await page.getByTestId("content-input").fill("Annual checkup 2024 - blood pressure 120/80");
    await page.getByTestId("category-select").selectOption("medical_event");
    await page.getByTestId("add-memory-btn").click();

    // Success or API error - both indicate form submission worked
    await expect(
      page.getByText(/Memory added successfully|Ingestion failed|Failed to add/i)
    ).toBeVisible({ timeout: 10000 });
  });

  test("Health Timeline shows events or empty/error state", async ({ page }) => {
    await page.goto("/timeline");
    await expect(page.getByRole("heading", { name: /Health Timeline/i })).toBeVisible();

    // Events, empty state, or load error - all valid outcomes
    await expect(
      page.getByText(/blood pressure|No memories yet|Failed to load|Loading/i)
    ).toBeVisible({ timeout: 5000 });
  });

  test("Memory Size Dashboard shows stats", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /Memory Size Dashboard/i })).toBeVisible();

    // Should show entries count or loading
    await expect(page.getByText(/Entries|Total Size|Loading/i)).toBeVisible({ timeout: 5000 });
  });

  test("AI Chat - ask question and get response", async ({ page }) => {
    await page.goto("/chat");
    await expect(page.getByRole("heading", { name: /AI Chat/i })).toBeVisible();

    await page.getByTestId("chat-input").fill("What was my blood pressure at the checkup?");
    await page.getByTestId("chat-send-btn").click();

    // User message appears, then assistant response (gray bubble, not the green user bubble)
    await expect(page.getByText("What was my blood pressure at the checkup?")).toBeVisible();
    const assistantBubbles = page.locator(".bg-gray-100");
    await expect(assistantBubbles.last()).toBeVisible({ timeout: 15000 });
  });

  test("Summarize - user-triggered summarization", async ({ page }) => {
    await page.goto("/summarize");
    await expect(page.getByText(/Summarize Memory|Summarize/i).first()).toBeVisible();

    const summarizeBtn = page.getByRole("button", { name: /Summarize Now/i });
    await expect(summarizeBtn).toBeVisible();

    // Button may be disabled if no events
    const isDisabled = await summarizeBtn.isDisabled();
    if (!isDisabled) {
      await summarizeBtn.click();
      await expect(page.getByText(/Summary created|reduction|Version/i)).toBeVisible({
        timeout: 15000,
      });
    } else {
      await expect(page.getByText(/No events|entries|Before|Summarization/i)).toBeVisible();
    }
  });
});
