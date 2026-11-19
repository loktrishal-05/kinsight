import { expect, test } from "@playwright/test";

test("the landing page shows a one-line service status", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("status-line")).toContainText("Demo mode"); // the e2e build runs in mock mode
});
