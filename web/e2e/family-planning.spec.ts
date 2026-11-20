import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("opens from Learn and shows only the selected care jurisdiction", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Family planning", exact: true })).toHaveAttribute("href", "/learn/family-planning");
  await page.goto("/learn");
  await page.getByRole("link", { name: "Family planning", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Family planning", exact: true })).toBeVisible();
  const region = page.getByRole("combobox", { name: "Where will you receive care?" });
  await expect(region).toHaveValue("general");
  await expect(page.getByRole("link", { name: "SEHA appointments and FAQs" })).toHaveCount(0);
  const writes: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/") && request.method() !== "GET") writes.push(request.url());
  });
  await region.selectOption("abuDhabi");
  await expect(page.getByRole("link", { name: "SEHA appointments and FAQs" })).toHaveAttribute("href", "https://www.seha.ae/public/faq");
  await region.selectOption("saudi");
  await expect(page.getByRole("link", { name: "SEHA appointments and FAQs" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Saudi Ministry of Health premarital screening service" })).toHaveAttribute("href", /^https:\/\/www\.moh\.gov\.sa\//);
  await page.getByText("Spacing or delaying pregnancy", { exact: true }).click();
  await expect(page.getByText("Which methods are available here?", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "Prepare for your session" }).last()).toHaveAttribute("href", "/prepare");
  await expect(page).toHaveURL(/\/learn\/family-planning$/);
  expect(writes).toEqual([]);
  await page.reload();
  await expect(region).toHaveValue("general");
  await page.goto("/plan");
  await expect(page.getByRole("link", { name: "Family planning", exact: true })).toHaveAttribute("href", "/learn/family-planning");
});

test("provides an Arabic RTL pathway and accessible expanded content", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("ks_lang", "ar"));
  await page.goto("/learn/family-planning");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { name: "تنظيم الأسرة", exact: true })).toBeVisible();
  await page.getByRole("combobox", { name: "أين ستتلقّى الرعاية؟" }).selectOption("abuDhabi");
  const topic = page.locator("details").filter({ hasText: "الاستعداد للحمل" });
  await topic.locator("summary").click();
  await expect(topic.getByText("اسأل في موعدك", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth));
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(violations).toEqual([]);
});

test("opens a fictional report pair without requesting a real report", async ({ page }) => {
  await page.goto("/report-compare");
  await expect(page.getByText("Use fictional or public sample reports", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Try fictional sample reports" }).click();
  await expect(page.locator("#report-first")).toHaveValue(/HBB/);
  await expect(page.getByRole("button", { name: "Try fictional sample reports" })).toHaveCount(0);
  await page.getByRole("button", { name: "Compare findings" }).click();
  await expect(page.getByRole("heading", { name: "Reported findings" })).toBeVisible();
});
