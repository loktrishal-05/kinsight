import { expect, test } from "@playwright/test";

test("two reported carriers: figures only after the person confirms recessive inheritance", async ({ page }) => {
  await page.goto("/report-compare");
  await page.getByRole("textbox", { name: "Partner A report" }).fill("CFTR | Cystic fibrosis | Carrier");
  await page.getByRole("textbox", { name: "Partner B report" }).fill("CFTR | Cystic fibrosis | Carrier");
  await page.getByRole("button", { name: "Compare findings" }).click();
  const panel = page.locator('[data-demo="report-whatif"]');
  await expect(panel).toBeVisible();
  await expect(panel.locator("[data-estimate]")).toHaveCount(0);

  await panel.getByRole("button", { name: "X-linked" }).click();
  await expect(panel.locator("[data-estimate]")).toHaveCount(0);
  await expect(panel.getByRole("link", { name: "Book a counsellor" })).toBeVisible();

  await panel.getByRole("button", { name: "Recessive (autosomal recessive)" }).click();
  await expect(panel.locator("[data-estimate]").first()).toContainText("25%");
  await expect(panel.locator("[data-estimate]").first()).toContainText(/educational estimate/i);
  await panel.getByLabel("Number of pregnancies").selectOption("2");
  await expect(panel.locator("[data-estimate]").nth(1)).toContainText("44%");
});

test("one carrier and one not detected: no couple figure is offered", async ({ page }) => {
  await page.goto("/report-compare");
  await page.getByRole("textbox", { name: "Partner A report" }).fill("CFTR | Cystic fibrosis | Carrier");
  await page.getByRole("textbox", { name: "Partner B report" }).fill("CFTR | Cystic fibrosis | Not detected");
  await page.getByRole("button", { name: "Compare findings" }).click();
  await expect(page.locator("#report-comparison")).toBeVisible();
  await expect(page.locator('[data-demo="report-whatif"]')).toHaveCount(0);
});

test("conflicting, annotated and multi-gene entries never offer an illustrative figure", async ({ page }) => {
  await page.goto("/report-compare");
  const first = page.getByRole("textbox", { name: "Partner A report" });
  await page.getByRole("textbox", { name: "Partner B report" }).fill("CFTR | Cystic fibrosis | Carrier");
  const compare = page.getByRole("button", { name: "Compare findings" });
  for (const entry of [
    "CFTR | Cystic fibrosis | Carrier\nCFTR | Cystic fibrosis | Not detected",
    "CFTR | Cystic fibrosis | Carrier | Classification pending",
  ]) {
    await first.fill(entry);
    await compare.click();
    await expect(page.getByText(/these entries include extra findings/i)).toBeVisible();
    await expect(page.locator('[data-demo="report-whatif"]')).toHaveCount(0);
  }
  const multiGene = "HBA1/HBA2 | Alpha thalassemia | Carrier";
  await first.fill(multiGene);
  await page.getByRole("textbox", { name: "Partner B report" }).fill(multiGene);
  await compare.click();
  await expect(page.getByText(/these entries include extra findings/i)).toBeVisible();
  await expect(page.locator('[data-demo="report-whatif"]')).toHaveCount(0);
});
