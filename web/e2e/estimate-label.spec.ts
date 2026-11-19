import { expect, test, type Page } from "@playwright/test";
import languages from "../messages/languages.json";

// Guard: every risk figure on screen ("25%", "1 in 4", "100 में 25") sits inside an <Estimate> (data-estimate), in every
// language. Cohort statistics that are not a chance for a person are marked data-not-risk.
const FIGURE = /\d\s?%|%\s?\d|\d+ (?:in|of|من|में|ல்|இல்|లో|ರಲ್ಲಿ|ರ|ൽ) \d+/;
const PAGES = ["home", "learn", "result", "couple", "understand", "consents", "family", "next", "summary", "privacy", "ask",
  "counsellor", "analyst", "governance", "methods", "plan", "plan/scenarios", "prepare", "clinic", "report-compare", "nasab"];

const unlabelled = (page: Page) => page.evaluate((src) => {
  const re = new RegExp(src);
  const out: string[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement;
    if (!el || !re.test(n.textContent ?? "") || el.closest("[data-estimate],[data-not-risk],script,style,noscript,[hidden]")) continue;
    out.push((n.textContent ?? "").trim().slice(0, 80));
  }
  return out;
}, FIGURE.source);

for (const { code } of languages) {
  test(`every risk figure is labelled as an educational estimate (${code})`, async ({ page }) => {
    await page.goto("/home");
    await page.waitForFunction(() => localStorage.getItem("ks_lang") !== null);
    await page.evaluate((l) => localStorage.setItem("ks_lang", l), code);
    await page.reload();
    // Both partners shared and the counsellor approved, so the couple's figures are on screen (mock state lives in sessionStorage).
    await page.evaluate(() => sessionStorage.setItem("ks_mock", JSON.stringify({ pooled: { a: true, b: true }, released: true })));
    await page.goto("/couple");
    await expect(page.locator("[data-estimate]").first()).toBeVisible(); // the figures exist, so the crawl below is not vacuous
    const bad: string[] = [];
    for (const path of PAGES) {
      await page.goto(`/${path}`);
      await page.waitForLoadState("networkidle");
      for (const t of await unlabelled(page)) bad.push(`${path}: ${t}`);
    }
    expect(bad).toEqual([]);
  });
}
