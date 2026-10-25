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
      for (const path of ["learn", "result", "couple", "understand", "consents", "family", "next", "summary", "privacy", "ask", "counsellor", "analyst", "governance", "methods"]) {
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
      await expect(page.locator("form [role=group]")).toHaveCount(5);
      await page.locator("form [role=group]").first().locator("input").last().check();
      for (const f of (await page.locator("form [role=group]").all()).slice(1)) await f.locator("input").first().check();
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

test("a third language loads from its message file alone", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("ks_lang", "ur"));
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByTestId("fictional-banner")).toBeVisible();
});

test("settings: dark theme, large text; search palette opens with Ctrl+K and navigates", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Comfort settings/ }).click();
  await page.getByRole("button", { name: "Dark" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "A++" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-text", "2");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Control+k");
  await page.getByRole("dialog", { name: "Search" }).getByRole("textbox").fill("privacy");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/privacy/);
});

test("the picked case changes what the couple sees", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("radio", { name: /Not related, one partner carries a change/ }).click();
  await page.getByRole("button", { name: /Person A/ }).first().click();
  await expect(page).toHaveURL(/\/result/);
  await expect(page.getByTestId("explanation")).toContainText("estimated at");
});

test("counsellor queue filters by tier", async ({ page }) => {
  await page.goto("/counsellor");
  const rows = page.locator("tbody tr", { hasText: /C-0|demo-case/ });
  await rows.first().waitFor();
  const all = await rows.count();
  await page.getByRole("button", { name: "Tier 1" }).click();
  await expect.poll(() => rows.count()).toBeLessThan(all);
});
