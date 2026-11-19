import { expect, test } from "@playwright/test";

test("notifications are off by default and switched on per type, on this device", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __asked: number }).__asked = 0;
    const N = window.Notification as unknown as { requestPermission: () => Promise<string> } | undefined;
    if (N) N.requestPermission = async () => { (window as unknown as { __asked: number }).__asked += 1; return "granted"; };
  });
  await page.goto("/home");
  await page.waitForFunction(() => localStorage.getItem("ks_lang") !== null);
  await page.evaluate(() => { localStorage.setItem("ks_lang", "en"); localStorage.removeItem("ks_notify"); });
  await page.goto("/privacy");
  const box = page.locator("[data-demo=notifications]");
  await expect(box.locator("input[type=checkbox]")).toHaveCount(5);
  await expect(box.locator("input:checked")).toHaveCount(0);
  await expect(box).toContainText("You have an update in KinSight");
  await box.getByLabel("When the lab moves your sample on").check();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("ks_notify") ?? "{}"))).toEqual({ lab_status: true });
  await page.reload();
  await expect(page.locator("[data-demo=notifications]").getByLabel("When the lab moves your sample on")).toBeChecked();
});
