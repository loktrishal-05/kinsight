import { expect, test } from "@playwright/test";

test("welcome -> own result -> explanation from the real API", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Person A/ }).click();
  await expect(page.getByRole("link", { name: /Person A/ })).toBeVisible(); // login finished
  await page.goto("/result");
  await expect(page.getByTestId("explanation")).toContainText("fictional", { timeout: 10_000 });
  await expect(page.getByText("Found").first()).toBeVisible();
  await page.goto("/analyst");
  await page.goto("/governance");
});
