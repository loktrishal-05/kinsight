import { expect, test, type Page } from "@playwright/test";

const as = (page: Page, persona: string) => page.evaluate((p) => { sessionStorage.setItem("ks_persona", p); localStorage.setItem("ks_persona", p); }, persona);

test("person invites two relatives, a relative opens the invite and reports back, the tracker updates", async ({ page }) => {
  await page.goto("/home");
  await page.waitForFunction(() => localStorage.getItem("ks_lang") !== null);
  await page.evaluate(() => localStorage.setItem("ks_lang", "en"));
  await as(page, "person_a");
  await page.goto("/cascade");
  const rows = page.locator("[data-demo=cascade-relative]");
  await expect(rows.first().locator("[data-estimate]")).toBeVisible();
  await rows.nth(0).getByRole("button", { name: "Send a private invite" }).click();
  const link = await rows.nth(0).locator("[data-demo=cascade-link]").innerText();
  await rows.nth(1).getByRole("button", { name: "Told them in person" }).click();
  await expect(rows.nth(0).locator("[data-demo=cascade-status]")).toHaveText("Invite sent");
  await expect(rows.nth(1).locator("[data-demo=cascade-status]")).toHaveText("Told in person");
  await expect(page.locator("[data-demo=cascade-progress]")).toContainText("2 /");

  await as(page, "relative");
  await page.goto("/invite");
  await page.locator("#family-token").fill(link);
  await page.locator("form:has(#family-token) button").click();
  const opened = page.locator("[data-demo=invite-opened]");
  await expect(opened).toBeVisible();
  await expect(opened).not.toContainText("synthetic-a");
  await opened.getByRole("button", { name: "I got tested" }).click();
  await expect(opened).toContainText("Thank you");

  await as(page, "person_a");
  await page.goto("/cascade");
  await expect(page.locator("[data-demo=cascade-relative]").nth(0).locator("[data-demo=cascade-status]")).toHaveText("Got tested");
});
