import { expect, test } from "@playwright/test";

test("what-if scenarios: two cards, labelled figures, table alternative, fixed option order", async ({ page }) => {
  await page.goto("/home");
  await page.waitForFunction(() => localStorage.getItem("ks_lang") !== null);
  await page.evaluate(() => { localStorage.setItem("ks_lang", "en"); sessionStorage.setItem("ks_mock", JSON.stringify({ pooled: { a: true, b: true }, released: true })); });
  await page.goto("/plan/scenarios");
  const one = page.locator("[data-demo=scenario-0]"), two = page.locator("[data-demo=scenario-1]");
  await expect(one.locator("[data-estimate]").first()).toBeVisible();
  await expect(two.locator("[data-estimate]").first()).toBeVisible();
  // Related partners raise the untested partner's carrier chance, so the two cards differ.
  const carrier = async (card: typeof one) => Number((await card.locator("dd", { hasText: "%" }).last().innerText()).match(/\d+/)![0]);
  expect(await carrier(two)).toBeGreaterThan(await carrier(one));
  await expect(one.getByRole("table")).toBeVisible();
  const titles = await one.locator("li b").allInnerTexts();
  expect(titles).toHaveLength(5);
  expect(titles[0]).toMatch(/without extra testing/);
  // Unsupported combination is explained, not shown as a figure.
  await one.getByLabel("First partner").selectOption("not_detected");
  await expect(one.getByRole("alert")).toBeVisible();
});
