import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { expect, test } from "@playwright/test";

test("only a reviewed current FHIR import is released", async ({ page, browser }) => {
  const fhirUrl = process.env.KINSIGHT_FHIR_SANDBOX_URL;
  test.skip(!fhirUrl || process.env.NEXT_PUBLIC_FHIR_SANDBOX !== "1", "Requires a disposable seeded HAPI server");
  test.setTimeout(90_000);
  const upload = (args: string[]) => promisify(execFile)(process.env.PYTHON ?? "python", [
    "-m", "scripts.export_fhir_bundles", "--upload", fhirUrl!, ...args,
  ], { cwd: resolve(".."), timeout: 30_000 });
  await upload([]);
  await page.goto("/signin");
  await page.getByTestId("signin-submit").click();
  await expect(page).toHaveURL(/\/home$/);
  await page.getByRole("button", { name: /^Person A/ }).click();
  await expect(page).toHaveURL(/\/result$/);
  await page.goto("/home");
  await page.getByRole("link", { name: "Import from my health record" }).click();
  await expect(page).toHaveURL(/\/result#fhir-preview-heading$/);
  const panel = page.getByRole("region", { name: "Health record preview" });
  const load = panel.getByRole("button", { name: "Load latest report" });
  await load.click();
  await expect(panel.getByRole("status")).toContainText("need counsellor review");
  await expect(panel.getByRole("listitem")).toHaveCount(28);
  await expect(panel.locator("time")).toHaveAttribute("dateTime", /^2026-01-01/);

  const reviewer = await browser.newPage();
  try {
    await reviewer.goto("/signin");
    await reviewer.getByTestId("signin-submit").click();
    await expect(reviewer).toHaveURL(/\/home$/);
    await reviewer.getByRole("button", { name: /^Counsellor/ }).click();
    const review = reviewer.getByRole("region", { name: "Review a synthetic health record" });
    const openReview = review.getByRole("button", { name: "Open shared report" });
    await openReview.click();
    await expect(review.getByRole("status")).toContainText("has not shared");
    await panel.getByRole("button", { name: "Save and share this version with the demo counsellor for one hour" }).click();
    await expect(panel.getByText("Saved and awaiting counsellor review.")).toBeVisible();
    await expect(panel.getByRole("listitem")).toHaveCount(0);
    await openReview.click();
    await expect(review.getByRole("listitem")).toHaveCount(30);
    await review.getByRole("button", { name: "Approve this revision" }).click();
    await expect(panel.getByText("Reviewed report released.")).toBeVisible({ timeout: 10_000 });
    await expect(panel.getByRole("listitem")).toHaveCount(30);

    await upload(["--correction"]);
    await expect(panel.getByText(/The source report changed/)).toBeVisible({ timeout: 10_000 });
    await expect(panel.getByRole("listitem")).toHaveCount(0);
    await expect(review.getByText(/The source report changed/)).toBeVisible({ timeout: 10_000 });
    await expect(review.getByRole("button", { name: "Approve this revision" })).toHaveCount(0);

    await load.click();
    await expect(panel.getByRole("status")).toContainText("need counsellor review");
    await expect(panel.getByRole("listitem")).toHaveCount(27);
    await expect(panel.locator("time")).toHaveAttribute("dateTime", /^2026-01-02/);
  } finally {
    await reviewer.close();
  }
});
