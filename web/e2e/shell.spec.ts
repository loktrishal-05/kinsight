import { expect, test, type Page } from "@playwright/test";

const as = async (page: Page, persona: string, mock: object = {}) => {
  await page.goto("/home");
  await page.waitForFunction(() => localStorage.getItem("ks_lang") !== null);
  await page.evaluate(([p, m]) => { localStorage.setItem("ks_lang", "en"); sessionStorage.setItem("ks_persona", p as string); localStorage.setItem("ks_persona", p as string);
    localStorage.removeItem("ks_rail"); sessionStorage.setItem("ks_mock", JSON.stringify(m)); }, [persona, mock]);
};

test("person menu is grouped by journey stage and collapses to a rail with Ctrl+B", async ({ page, isMobile }) => {
  test.skip(isMobile, "the sidebar is desktop only");
  await as(page, "person_a");
  await page.goto("/result");
  const nav = page.locator("aside [data-demo=nav]").first();
  const headings = nav.locator("p");
  await expect(headings).toHaveText(["Start", "My result", "Plan and prepare", "Family", "Privacy", "Help"]);
  await expect(nav.locator("a[aria-current=page]")).toHaveAttribute("href", "/result");
  await page.keyboard.press("Control+b");
  await expect(page.locator("[data-demo=rail-toggle]")).toHaveAttribute("aria-pressed", "true");
  await expect(headings.first()).toHaveClass(/sr-only/);
  await page.reload();
  await expect(page.locator("[data-demo=rail-toggle]")).toHaveAttribute("aria-pressed", "true"); // remembered on this device
});

test("counsellor sees how many items wait for review on their menu entry", async ({ page, isMobile }) => {
  test.skip(isMobile, "the sidebar is desktop only");
  await as(page, "counsellor", { pooled: { a: true, b: true }, released: false, counselling: true });
  await page.goto("/counsellor");
  await expect(page.locator("aside [data-demo=badge-counsellor]").first()).toContainText("2");
});

test("on a phone a person gets a bottom tab bar with four destinations", async ({ page, isMobile }) => {
  test.skip(!isMobile, "phone layout only");
  await as(page, "person_a");
  await page.goto("/home");
  const bar = page.locator("[data-demo=tabbar]");
  await expect(bar.getByRole("link")).toHaveCount(4);
  await bar.getByRole("link", { name: /result/i }).click();
  await expect(page).toHaveURL(/\/result$/);
});
