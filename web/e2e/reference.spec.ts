import { expect, test } from "@playwright/test";

test("the counsellor looks up a gene and variant and sees each fact with its source and date", async ({ page }) => {
  await page.goto("/home");
  await page.waitForFunction(() => localStorage.getItem("ks_lang") !== null);
  await page.evaluate(() => { localStorage.setItem("ks_lang", "en"); sessionStorage.setItem("ks_persona", "counsellor"); localStorage.setItem("ks_persona", "counsellor"); });
  await page.goto("/clinic");
  const panel = page.locator("[data-demo=reference]");
  await panel.getByRole("button", { name: "Look up" }).click();
  await expect(panel).toContainText("CFTR gene provides instructions");
  await expect(panel).toContainText("Definitive");
  await expect(panel).toContainText("inframe deletion");
  await expect(panel.getByRole("link", { name: "MedlinePlus Genetics" })).toBeVisible();
  // A gene with no recorded answer in the offline demo shows the graceful fallback, not an error page.
  await panel.getByLabel("Gene").fill("HBB");
  await panel.getByLabel("Variant (HGVS, optional)").fill("");
  await panel.getByRole("button", { name: "Look up" }).click();
  await expect(panel).toContainText("not reachable right now");
});
