import { expect, test } from "@playwright/test";

// The chosen role must survive new tabs and reloads, and a first visit must never land on an empty "restricted" page.
test("a page opened directly, with no role chosen yet, shows the Person A view", async ({ page }) => {
  await page.goto("/journey");
  await expect(page.getByRole("heading", { name: "My journey" })).toBeVisible();
  await page.goto("/plan");
  await expect(page.getByRole("heading", { name: "Care plan" })).toBeVisible();
  await page.goto("/nasab");
  await expect(page.getByRole("heading", { name: "Family tree questions" })).toBeVisible();
});

test("the chosen role is remembered in a new tab", async ({ page, context }) => {
  await page.goto("/home");
  await page.getByRole("button", { name: /^Counsellor/ }).click();
  const tab = await context.newPage();
  await tab.goto("/clinic");
  await expect(tab.getByRole("heading", { name: "Clinic tools" })).toBeVisible();
  await tab.goto("/journey");
  await expect(tab.getByText("This page is available in person views.")).toBeVisible();
  await expect(tab.getByRole("link", { name: "Switch view" })).toHaveAttribute("href", "/home");
});
