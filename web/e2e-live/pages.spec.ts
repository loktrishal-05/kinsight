import { expect, test } from "@playwright/test";

// Real-API content checks for the screens that used to look empty or garbled.
async function signInAs(page: import("@playwright/test").Page, role: RegExp) {
  await page.goto("/signin");
  await page.waitForLoadState("networkidle");
  await page.getByTestId("demo-account").click();
  await page.getByTestId("signin-submit").click();
  await expect(page).toHaveURL(/\/home$/);
  await page.getByRole("button", { name: role }).click();
}

test("family circle shows three generations with readable labels", async ({ page }) => {
  await signInAs(page, /^Person A/);
  await page.goto("/family");
  const tree = page.getByRole("img", { name: "Pedigree" });
  await expect(tree).toBeVisible({ timeout: 60_000 });
  for (const label of ["GF", "GM", "P1", "S1", "P2", "S2", "A", "B"]) await expect(tree.getByText(label, { exact: true })).toBeVisible();
  await expect(tree.getByText("synthetic-a")).toHaveCount(0);
});

test("results use readable condition names, not raw ids", async ({ page }) => {
  await signInAs(page, /^Person A/);
  await expect(page).toHaveURL(/\/result/);
  await expect(page.getByText(/Inherited .* \(illustrative\)/).first()).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("COND_001")).toHaveCount(0);
});

test("counsellor console has a real caseload", async ({ page }) => {
  await signInAs(page, /^Counsellor/);
  await expect(page).toHaveURL(/\/counsellor/);
  await expect(page.getByText("Nothing found.")).toHaveCount(0, { timeout: 60_000 });
  await expect(page.locator("tbody tr").first()).toBeVisible();
});

test("privacy centre lists the person's real access trail", async ({ page }) => {
  await signInAs(page, /^Person A/);
  await page.goto("/result");
  await page.goto("/privacy");
  await expect(page.getByText(/looked at your result/).first()).toBeVisible({ timeout: 60_000 });
});
