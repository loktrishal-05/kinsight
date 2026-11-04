import { expect, test } from "@playwright/test";

// Real API: opening a screen directly in a fresh tab signs in quietly and shows real data (no restricted notice, no 401 screen).
test("a fresh tab opened straight on /journey loads the tracker from the API", async ({ page }) => {
  await page.goto("/journey");
  await expect(page.getByRole("heading", { name: "My journey" })).toBeVisible();
  const lab = page.getByRole("region", { name: "Lab tracker" });
  await expect(lab.locator('[aria-current="step"]')).toBeVisible({ timeout: 60_000 });
  await page.goto("/plan");
  await expect(page.getByRole("heading", { name: "Care plan" })).toBeVisible();
});
