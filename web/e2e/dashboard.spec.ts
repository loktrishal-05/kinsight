import { expect, test, type Page } from "@playwright/test";

const start = async (page: Page, mock: object) => {
  await page.goto("/home");
  await page.waitForFunction(() => localStorage.getItem("ks_lang") !== null);
  await page.evaluate((m) => { localStorage.setItem("ks_lang", "en"); sessionStorage.setItem("ks_persona", "person_a"); localStorage.setItem("ks_persona", "person_a"); sessionStorage.setItem("ks_mock", JSON.stringify(m)); }, mock);
  await page.goto("/home");
};

test("person home: next step and a card per area, each linking to its page", async ({ page }) => {
  await start(page, { pooled: { a: true, b: true }, released: true });
  const dash = page.locator("[data-demo=dashboard]");
  await expect(dash.locator("[data-demo=dash-card]")).toHaveCount(6);
  await expect(dash.locator("[data-demo=next-step]")).toHaveAttribute("href", "/prepare");
  const couple = dash.locator("[data-demo=dash-card][href='/couple']");
  await expect(couple.locator("[data-estimate]")).toBeVisible(); // the released figure carries its label
  for (const href of ["/result", "/couple", "/prepare", "/cascade", "/consents", "/ask"]) await expect(dash.locator(`a[href='${href}']`).first()).toBeVisible();
});

test("while a counsellor reviews the couple result, home shows the waiting state, not the figure", async ({ page }) => {
  await start(page, { pooled: { a: true, b: true }, released: false });
  const couple = page.locator("[data-demo=dashboard] [data-demo=dash-card][href='/couple']");
  await expect(couple).toContainText("A counsellor is looking at this first");
  await expect(couple.locator("[data-estimate]")).toHaveCount(0);
  await expect(page.locator("[data-demo=next-step]")).toHaveAttribute("href", "/couple");
});
