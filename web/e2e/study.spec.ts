import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

// Volunteer study: consent in the participant's language, read, answer, rate; the facilitator page counts it and exports CSV.
test("a participant completes the study in Hindi and the facilitator exports it", async ({ page }) => {
  await page.addInitScript(() => { if (!sessionStorage.getItem("seeded")) { localStorage.clear(); sessionStorage.setItem("seeded", "1"); } localStorage.setItem("ks_lang", "hi"); });
  await page.goto("/study");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("KinSight");
  await expect(page.getByTestId("study-start")).toBeDisabled();
  await page.getByTestId("study-agree").check();
  await page.getByTestId("study-start").click();

  await expect(page.getByTestId("study-text")).toContainText("%"); // the engine's figure, in the verified Hindi text
  await page.getByTestId("study-read").click();

  await page.getByTestId("study-submit").click();
  await expect(page.getByRole("alert").filter({ hasText: "कृपया" })).toBeVisible(); // every question must be answered
  for (const group of await page.locator("fieldset").all()) await group.getByRole("radio").first().check();
  await page.getByTestId("study-submit").click();
  await page.getByTestId("study-rate-4").click();
  await expect(page.getByTestId("study-id")).toHaveText(/^S-[0-9A-F]{8}$/);

  await page.goto("/study/results");
  await expect(page.getByTestId("study-total")).toHaveText("1");
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByTestId("study-csv").click()]);
  const csv = readFileSync((await download.path())!, "utf-8").trim().split("\n");
  expect(csv[0]).toBe("study_id,language,reading_level,case_id,correct,total,passed,clarity,missed,started_at,finished_at");
  expect(csv[1]).toMatch(/^S-[0-9A-F]{8},hi,basic,s3,\d,5,(true|false),4,/);
});

test("a storage failure keeps the current response available for retry", async ({ page }) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "ks_study_responses" && !sessionStorage.getItem("study-can-save")) {
        throw new DOMException("Synthetic storage error", "QuotaExceededError");
      }
      return original.call(this, key, value);
    };
    const remove = Storage.prototype.removeItem;
    Storage.prototype.removeItem = function (key) {
      if (key === "ks_study_responses" && !sessionStorage.getItem("study-can-clear")) {
        throw new DOMException("Synthetic storage error", "SecurityError");
      }
      return remove.call(this, key);
    };
  });
  await page.goto("/study");
  await page.getByTestId("study-agree").check();
  await page.getByTestId("study-start").click();
  await page.getByTestId("study-read").click();
  for (const group of await page.locator("fieldset").all()) await group.getByRole("radio").first().check();
  await page.getByTestId("study-submit").click();
  await page.getByTestId("study-rate-4").click();
  await expect(page.getByRole("alert").filter({ hasText: "The answers could not be saved" })).toBeVisible();
  await expect(page.getByTestId("study-id")).toHaveCount(0);
  await page.evaluate(() => sessionStorage.setItem("study-can-save", "1"));
  await page.getByTestId("study-rate-4").click();
  await expect(page.getByTestId("study-id")).toBeVisible();
  await page.goto("/study/results");
  await expect(page.getByTestId("study-total")).toHaveText("1");
  await page.getByRole("button", { name: "Clear all" }).click();
  await page.getByTestId("study-clear-yes").click();
  await expect(page.getByRole("alert").filter({ hasText: "The responses could not be deleted" })).toBeVisible();
  await expect(page.getByTestId("study-total")).toHaveText("1");
  await page.evaluate(() => sessionStorage.setItem("study-can-clear", "1"));
  await page.getByTestId("study-clear-yes").click();
  await expect(page.getByTestId("study-total")).toHaveText("0");
  await page.reload();
  await expect(page.getByTestId("study-csv")).toBeDisabled();
});
