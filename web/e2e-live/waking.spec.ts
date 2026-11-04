import { expect, test } from "@playwright/test";

// A slow API call (a sleeping free-tier server) shows the "waking up" notice, which disappears once the call finishes.
test("slow sign-in shows the waking notice and then clears it", async ({ page }) => {
  await page.route("**/api/auth/persona", async (route) => {
    await new Promise((r) => setTimeout(r, 6000));
    await route.continue();
  });
  await page.goto("/signin");
  await page.waitForLoadState("networkidle");
  await page.getByTestId("demo-account").click();
  await page.getByTestId("signin-submit").click();
  await expect(page).toHaveURL(/\/home$/);
  await page.getByRole("button", { name: /Person A/ }).click();
  await expect(page.getByTestId("waking-notice")).toBeVisible({ timeout: 10_000 });
  await expect(page).toHaveURL(/\/result/, { timeout: 30_000 });
  await expect(page.getByTestId("waking-notice")).toHaveCount(0);
});
