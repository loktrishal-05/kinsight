import { expect, test, type Page } from "@playwright/test";

const as = (page: Page, persona: string) => page.evaluate((p) => { sessionStorage.setItem("ks_persona", p); localStorage.setItem("ks_persona", p); }, persona);

test("hold shows the person a calm waiting state; approve releases the couple view", async ({ page }) => {
  await page.goto("/home");
  await page.waitForFunction(() => localStorage.getItem("ks_lang") !== null);
  await page.evaluate(() => { localStorage.setItem("ks_lang", "en"); sessionStorage.setItem("ks_mock", JSON.stringify({ pooled: { a: true, b: true }, released: false, counselling: true })); });

  await as(page, "counsellor");
  await page.goto("/counsellor");
  const queue = page.locator("[data-demo=review-queue]");
  const talk = queue.locator("li", { hasText: "Request to talk" });
  await talk.getByRole("button", { name: "Hold" }).click();
  await expect(talk.getByText("On hold")).toBeVisible();
  // Result-releasing items link to their own review instead of being approved blind.
  await expect(queue.locator("li", { hasText: "Couple result" }).getByRole("link", { name: "Open review" })).toBeVisible();

  await as(page, "person_a");
  await page.goto("/couple");
  await expect(page.locator("[data-demo=review-status]")).toContainText("A counsellor is looking at this");
  await expect(page.locator("[data-demo=finding]")).toHaveCount(0);

  await as(page, "counsellor");
  await page.goto("/counsellor");
  await page.locator("[data-demo=approve]").click(); // the case's own review approves and releases
  await expect(page.locator("[data-demo=review-queue] li", { hasText: "Couple result" }).getByText("Approved")).toBeVisible();
  await as(page, "person_a");
  await page.goto("/couple");
  await expect(page.locator("[data-demo=finding]").first()).toBeVisible();
});
