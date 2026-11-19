import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// WCAG 2.0 / 2.1 / 2.2 level A and AA, checked by axe on every page in English, Arabic (RTL) and Hindi.
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const PAGES: [string, string][] = [
  ["person_a", "home"], ["person_a", "learn"], ["person_a", "result"], ["person_a", "couple"], ["person_a", "understand"],
  ["person_a", "next"], ["person_a", "access"], ["person_a", "summary"], ["person_a", "family"], ["person_a", "consents"],
  ["person_a", "privacy"], ["person_a", "ask"], ["person_a", "plan"], ["person_a", "plan/scenarios"], ["person_a", "prepare"],
  ["person_a", "cascade"], ["person_a", "nasab"], ["person_a", "checkin"], ["person_a", "journey"], ["person_a", "report-compare"],
  ["person_a", "methods"], ["counsellor", "counsellor"], ["counsellor", "clinic"], ["analyst", "analyst"],
  ["auditor", "governance"], ["relative", "invite"], ["person_a", "signin"],
];

for (const lang of ["en", "ar", "hi"]) {
  test(`no WCAG A/AA violations on any page (${lang})`, async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto("/home");
    await page.waitForFunction(() => localStorage.getItem("ks_lang") !== null);
    await page.evaluate((l) => { localStorage.setItem("ks_lang", l); sessionStorage.setItem("ks_mock", JSON.stringify({ pooled: { a: true, b: true }, released: true })); }, lang);
    const found: string[] = [];
    for (const [persona, path] of PAGES) {
      await page.evaluate((p) => { sessionStorage.setItem("ks_persona", p); localStorage.setItem("ks_persona", p); }, persona);
      await page.goto(`/${path}`);
      await page.waitForLoadState("networkidle");
      const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      for (const v of violations) found.push(`${path}: ${v.id} (${v.impact}) x${v.nodes.length} ${v.nodes[0]?.target.join(" ")}`);
    }
    expect(found).toEqual([]);
  });
}
