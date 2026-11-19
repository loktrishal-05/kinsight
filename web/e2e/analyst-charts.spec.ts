import { expect, test } from "@playwright/test";

test("each chart has a summary, a table view and an aggregate-only CSV", async ({ page }) => {
  await page.goto("/home");
  await page.waitForFunction(() => localStorage.getItem("ks_lang") !== null);
  await page.evaluate(() => { localStorage.setItem("ks_lang", "en"); sessionStorage.setItem("ks_persona", "analyst"); localStorage.setItem("ks_persona", "analyst"); });
  await page.goto("/analyst");
  for (const id of ["tiers", "funnel", "weekly"]) {
    const card = page.locator(`[data-demo=${id}]`);
    await expect(card.locator("[data-demo=chart-summary]")).not.toBeEmpty();
    await card.getByRole("button", { name: "Show as table" }).click();
    await expect(card.getByRole("table")).toBeVisible();
    await expect(card.getByRole("button", { name: "Show as table" })).toHaveAttribute("aria-pressed", "true");
  }
  const funnel = decodeURIComponent((await page.locator("[data-demo=funnel] a[download]").getAttribute("href")) ?? "");
  expect(funnel).toContain("Step,Count");
  expect(funnel).not.toMatch(/,\d/); // in a one-person demo every step is below the threshold, so no count is exported
});
