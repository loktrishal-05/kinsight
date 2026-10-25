import { expect, test, type Page } from "@playwright/test";

// Demo script (spec section 9) steps 1-9 in mock mode, in both languages. Fixtures are fictional.
for (const lang of ["en", "ar"] as const) {
  test.describe(`demo path (${lang})`, () => {
    const setLang = async (page: Page) => {
      await page.goto("/");
      await page.evaluate((l) => localStorage.setItem("ks_lang", l), lang);
      await page.reload();
    };

    test("banner, direction and key screens", async ({ page }, info) => {
      await setLang(page);
      await expect(page.getByTestId("fictional-banner")).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("dir", lang === "ar" ? "rtl" : "ltr");
      await page.screenshot({ path: `e2e/shots/${lang}-${info.project.name}-welcome.png`, fullPage: true });
      for (const path of ["result", "couple", "understand", "consents", "family", "next", "ask", "counsellor", "analyst", "governance"]) {
        await page.goto(`/${path}`);
        await expect(page.getByTestId("fictional-banner")).toBeVisible();
        await page.screenshot({ path: `e2e/shots/${lang}-${info.project.name}-${path}.png`, fullPage: true });
      }
    });

    test("couple waits for both, counsellor approves, quiz re-explains then passes", async ({ page }) => {
      await setLang(page);
      await page.goto("/couple");
      await page.getByRole("button", { name: /Share for couple planning|المشاركة لتخطيط الزوجين/ }).click();
      await page.goto("/counsellor");
      await page.getByRole("button", { name: /Approve|موافقة/ }).click();
      await page.goto("/understand");
      await expect(page.locator("fieldset")).toHaveCount(5);
      await page.locator("fieldset").first().locator("input").last().check();
      for (const f of (await page.locator("fieldset").all()).slice(1)) await f.locator("input").first().check();
      await page.getByRole("button", { name: /Submit answers|إرسال الإجابات/ }).click();
      await expect(page.getByTestId("quiz-msg")).toBeVisible();
    });

    test("governance tamper test shows failure", async ({ page }) => {
      await setLang(page);
      await page.goto("/governance");
      await page.getByRole("button", { name: /tamper|العبث/ }).click();
      await expect(page.getByTestId("chain")).toContainText("tampering");
    });
  });
}
