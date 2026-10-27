import { expect, test } from "@playwright/test";

// Public flow: the landing page stands outside the app, sign-in is a demo (the demo-account button fills the fields), then the app.
test("landing -> sign in with the demo account -> app home", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Ask Kin" })).toHaveCount(0);
  await expect(page.getByTestId("fictional-banner")).toHaveCount(0);
  await page.getByTestId("hero-signin").click();
  await expect(page).toHaveURL(/\/signin$/);

  await page.getByTestId("signin-submit").click();
  await expect(page.getByRole("alert").filter({ hasText: "Enter a username and password" })).toBeVisible();

  await page.getByTestId("demo-account").click();
  await expect(page.getByLabel("Username")).toHaveValue("demo.user");
  await expect(page.getByLabel("Password", { exact: true })).not.toHaveValue("");
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("type", "text");

  await page.getByTestId("signin-submit").click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByTestId("fictional-banner")).toBeVisible();
  await expect(page.getByRole("button", { name: "Ask Kin" })).toBeVisible();
});

test("sign-in works without the video and in Arabic", async ({ page }) => {
  // Set before any page script runs: the language provider writes the stored language back after it loads.
  await page.addInitScript(() => localStorage.setItem("ks_lang", "ar"));
  await page.goto("/signin");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByTestId("demo-account").click();
  await page.getByTestId("signin-submit").click();
  await expect(page).toHaveURL(/\/home$/);
});
