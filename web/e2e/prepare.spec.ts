import { expect, test } from "@playwright/test";

// A person prepares and shares one section; the counsellor sees that section and nothing else (mock mode).
test("prepare, share and the counsellor reads the shared section only", async ({ page }) => {
  await page.goto("/home");
  await page.waitForFunction(() => localStorage.getItem("ks_lang") !== null);
  await page.evaluate(() => localStorage.setItem("ks_lang", "en"));
  await page.goto("/prepare");
  await page.getByRole("button", { name: "What worries me", exact: true }).first().click();
  await page.getByLabel("How my family may react").check();
  await page.getByLabel("Anything else you would like to say").fill("a private worry");
  await page.getByRole("button", { name: "Questions", exact: true }).first().click();
  await page.getByRole("button", { name: "Add" }).first().click();
  await page.getByRole("button", { name: "Share", exact: true }).first().click();
  await expect(page.getByText("Nothing is shared.")).toBeVisible();
  await page.getByLabel("My questions").check();
  await expect(page.getByText("Saved")).toBeVisible();
  await expect(page.locator("#sheet-title")).toBeVisible();

  await page.evaluate(() => { sessionStorage.setItem("ks_persona", "counsellor"); localStorage.setItem("ks_persona", "counsellor"); });
  await page.goto("/counsellor");
  const panel = page.locator("[data-demo=prep-review]");
  await expect(panel.getByRole("heading", { name: "Questions" })).toBeVisible();
  await expect(panel.getByText("a private worry")).toHaveCount(0);
  await expect(panel.getByText("family reaction")).toHaveCount(0);
});
