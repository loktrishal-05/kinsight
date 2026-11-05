import { expect, test } from "@playwright/test";
test("the Ask page hydrates without errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message.slice(0, 100)));
  await page.goto("/signin"); await page.waitForLoadState("networkidle");
  await page.getByTestId("demo-account").click(); await page.getByTestId("signin-submit").click();
  await expect(page).toHaveURL(/\/home$/);
  await page.goto("/ask", { waitUntil: "load" });
  await page.waitForTimeout(2500);
  await expect(page.getByRole("heading", { name: "Ask a question" })).toBeVisible();
  expect(errors).toEqual([]);
});
