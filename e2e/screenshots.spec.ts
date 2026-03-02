import { test } from "@playwright/test";
import path from "path";
import fs from "fs";

const SCREENSHOT_DIR = path.join(process.cwd(), "e2e", "screenshots");

test.describe("Screenshot tests", () => {
  test.beforeAll(() => {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
  });

  test("home page", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "home.png"),
      fullPage: true,
    });
  });

  test("upload page", async ({ page }) => {
    await page.goto("/upload");
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "upload.png"),
      fullPage: true,
    });
  });

  test("timeline page", async ({ page }) => {
    await page.goto("/timeline");
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "timeline.png"),
      fullPage: true,
    });
  });

  test("chat page", async ({ page }) => {
    await page.goto("/chat");
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "chat.png"),
      fullPage: true,
    });
  });

  test("profile page", async ({ page }) => {
    await page.goto("/profile");
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "profile.png"),
      fullPage: true,
    });
  });

  test("dashboard page", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "dashboard.png"),
      fullPage: true,
    });
  });

  test("search page", async ({ page }) => {
    await page.goto("/search");
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "search.png"),
      fullPage: true,
    });
  });
});
