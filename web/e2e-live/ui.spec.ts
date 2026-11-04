import { expect, test } from "@playwright/test";

// Runs against a build with NEXT_PUBLIC_MOCK=0 whose /api is proxied to a live API (local or Render).
test("sign in -> own result from the real API -> journey and clinic screens", async ({ page }) => {
  await page.goto("/signin");
  await page.waitForLoadState("networkidle");
  await page.getByTestId("demo-account").click();
  await page.getByTestId("signin-submit").click();
  await expect(page).toHaveURL(/\/home$/);
  await page.getByRole("button", { name: /Person A/ }).click();
  await expect(page).toHaveURL(/\/result/, { timeout: 60_000 }); // login finished

  await expect(page.getByTestId("explanation")).toContainText("fictional", { timeout: 60_000 });
  await expect(page.getByText("Found").first()).toBeVisible();
  await page.goto("/journey");
  await expect(page.getByRole("heading", { name: "My journey" })).toBeVisible();
  const lab = page.getByRole("region", { name: "Lab tracker" });
  await expect(lab.locator('[aria-current="step"]')).toBeVisible({ timeout: 30_000 });
  await page.goto("/analyst");
  await page.goto("/governance");
});
