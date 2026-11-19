import { expect, test } from "@playwright/test";

// Narrow phones: no page may scroll sideways (wide tables scroll inside their own region instead).
const PAGES: [string, string][] = [
  ["person_a", "home"], ["person_a", "learn"], ["person_a", "result"], ["person_a", "couple"], ["person_a", "understand"],
  ["person_a", "next"], ["person_a", "access"], ["person_a", "summary"], ["person_a", "family"], ["person_a", "consents"],
  ["person_a", "privacy"], ["person_a", "ask"], ["person_a", "plan"], ["person_a", "plan/scenarios"], ["person_a", "prepare"],
  ["person_a", "cascade"], ["person_a", "nasab"], ["person_a", "checkin"], ["person_a", "journey"], ["person_a", "methods"],
  ["counsellor", "counsellor"], ["counsellor", "clinic"], ["analyst", "analyst"], ["auditor", "governance"], ["relative", "invite"],
];

for (const width of [360, 390]) {
  test(`no sideways scrolling at ${width}px`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/home");
    await page.waitForFunction(() => localStorage.getItem("ks_lang") !== null);
    await page.evaluate(() => { localStorage.setItem("ks_lang", "en"); sessionStorage.setItem("ks_mock", JSON.stringify({ pooled: { a: true, b: true }, released: true })); });
    const wide: string[] = [];
    for (const [persona, path] of PAGES) {
      await page.evaluate((p) => { sessionStorage.setItem("ks_persona", p); localStorage.setItem("ks_persona", p); }, persona);
      await page.goto(`/${path}`);
      await page.waitForLoadState("networkidle");
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (over > 1) wide.push(`${path}: +${over}px`);
    }
    expect(wide).toEqual([]);
  });
}

test("the offline page speaks the chosen language", async ({ page }) => {
  await page.goto("/home");
  await page.waitForFunction(() => localStorage.getItem("ks_lang") !== null);
  await page.evaluate(() => localStorage.setItem("ks_lang", "ar"));
  await page.goto("/offline.html");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("#t")).toHaveText("أنت غير متصل");
});
