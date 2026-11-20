import { expect, test } from "@playwright/test";

// Design-system rules every page must keep (web/DESIGN.md): one h1 from PageHeader, one main landmark, no spinners.
const PAGES: [string, string][] = [
  ["person_a", "home"], ["person_a", "learn"], ["person_a", "learn/family-planning"], ["person_a", "result"], ["person_a", "couple"], ["person_a", "understand"],
  ["person_a", "next"], ["person_a", "access"], ["person_a", "summary"], ["person_a", "family"], ["person_a", "consents"],
  ["person_a", "privacy"], ["person_a", "ask"], ["person_a", "plan"], ["person_a", "plan/scenarios"], ["person_a", "prepare"],
  ["person_a", "cascade"], ["person_a", "nasab"], ["person_a", "checkin"], ["person_a", "journey"], ["person_a", "methods"],
  ["counsellor", "counsellor"], ["counsellor", "clinic"], ["analyst", "analyst"], ["auditor", "governance"], ["relative", "invite"],
];

test("every page has exactly one h1 and one main landmark", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto("/home");
  await page.waitForFunction(() => localStorage.getItem("ks_lang") !== null);
  await page.evaluate(() => localStorage.setItem("ks_lang", "en"));
  const bad: string[] = [];
  for (const [persona, path] of PAGES) {
    await page.evaluate((p) => { sessionStorage.setItem("ks_persona", p); localStorage.setItem("ks_persona", p); }, persona);
    await page.goto(`/${path}`);
    await page.waitForLoadState("networkidle");
    const h1 = await page.locator("h1").count();
    const main = await page.locator("main").count();
    if (h1 !== 1 || main !== 1) bad.push(`${path}: h1=${h1} main=${main}`);
  }
  expect(bad).toEqual([]);
});
