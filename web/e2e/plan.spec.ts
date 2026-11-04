import { expect, test } from "@playwright/test";

test("demo care plan: book and cancel, calculate gestation, answer family questions", async ({ page }) => {
  await page.goto("/signin");
  await page.getByTestId("demo-account").click();
  await page.getByTestId("signin-submit").click();
  await expect(page).toHaveURL(/\/home$/);
  await page.getByRole("button", { name: /Person A/ }).click();
  await page.goto("/plan");
  await expect(page.getByRole("heading", { name: "Care plan" })).toBeVisible();
  const booking = page.getByRole("region", { name: "Priority counselling booking" });
  await booking.getByLabel("Choose urgency").selectOption("12");
  await booking.getByRole("button", { name: "Book", exact: true }).first().click();
  await expect(booking.getByRole("status")).toContainText("Booked");
  await page.reload();
  await booking.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(booking.getByRole("status")).toContainText("Cancelled");
  const calendar = page.getByRole("region", { name: "Gestational calendar" });
  await calendar.getByLabel("Days since last period").fill("71");
  await calendar.getByRole("button", { name: "Calculate", exact: true }).click();
  await expect(calendar.getByRole("status")).toContainText("10 weeks 1 days");
  await expect(calendar.getByRole("status")).toContainText("Days to day 120: 49");
  await expect(calendar.getByRole("status")).toContainText("In the 10");
  await page.goto("/nasab");
  await page.getByRole("button", { name: "First cousins", exact: true }).click();
  await page.getByRole("button", { name: "Show estimate" }).click();
  const result = page.getByRole("region", { name: "Are you and your partner related?" }).getByRole("status");
  await expect(result).toContainText("Relatedness coefficient: 0.0625");
  await expect(result).toContainText("An estimate from the answers you gave, not a diagnosis.");
});

test("certificate lock links to the understanding check", async ({ page }) => {
  await page.goto("/signin");
  await page.getByTestId("demo-account").click();
  await page.getByTestId("signin-submit").click();
  await expect(page).toHaveURL(/\/home$/);
  await page.getByRole("button", { name: /Person A/ }).click();
  await page.goto("/journey");
  const certificate = page.getByRole("region", { name: "Certificate countdown" });
  await expect(certificate.getByRole("status")).toContainText("Finish the short understanding check to open this");
  await expect(certificate.getByRole("link", { name: "Open understanding check" })).toHaveAttribute("href", "/understand");
});
