import { expect, test } from "@playwright/test";

test("a booked session offers calendar and video links with no health information", async ({ page }) => {
  await page.goto("/home");
  await page.waitForFunction(() => localStorage.getItem("ks_lang") !== null);
  await page.evaluate(() => localStorage.setItem("ks_lang", "en"));
  await page.goto("/plan");
  await page.getByRole("button", { name: "Book" }).first().click();
  const links = page.locator("[data-demo=booking-links]");
  const ics = links.getByRole("link", { name: "Add to calendar (.ics)" });
  await expect(ics).toHaveAttribute("download", "kinsight-appointment.ics");
  const text = decodeURIComponent((await ics.getAttribute("href")) ?? "");
  expect(text).toContain("SUMMARY:KinSight appointment");
  expect(text.toLowerCase()).not.toMatch(/carrier|gene|result|condition|risk/);
  await links.getByRole("button", { name: "Add a video link" }).click();
  await expect(links.getByRole("link", { name: /meet\.jit\.si\/KinSight-[0-9a-f]{24}/ })).toBeVisible();
});

test("the service directory marks every entry as a sample", async ({ page }) => {
  await page.goto("/access");
  const dir = page.locator("[data-demo=directory]");
  await expect(dir.locator("li")).toHaveCount(5);
  await expect(dir.locator("li", { hasText: "Sample" })).toHaveCount(5);
});
