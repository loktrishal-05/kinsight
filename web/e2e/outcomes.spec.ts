import { expect, test } from "@playwright/test";

test("analyst sees outcome measures, hidden below the privacy threshold, and no marriage metric", async ({ page }) => {
  await page.goto("/home");
  await page.waitForFunction(() => localStorage.getItem("ks_lang") !== null);
  await page.evaluate(() => { localStorage.setItem("ks_lang", "en"); sessionStorage.setItem("ks_persona", "analyst"); localStorage.setItem("ks_persona", "analyst"); });
  await page.goto("/analyst");
  const box = page.locator("[data-demo=outcomes]");
  await expect(box.getByRole("heading", { name: /Outcome measures/ })).toBeVisible();
  await expect(box.locator("dd")).toHaveCount(10);
  await expect(box.getByText("Hidden: fewer than 10").first()).toBeVisible();
  await expect(box).toContainText("does not measure marriages");
});
