import { expect, test, type Page } from "@playwright/test";

// Keyboard only: skip link, then reach and operate the preparation sheet's sharing step without a mouse.
async function tabTo(page: Page, name: RegExp, max = 120) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    const label = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return "";
      const id = el.getAttribute("id");
      const forLabel = id ? document.querySelector(`label[for="${id}"]`)?.textContent : "";
      return `${el.getAttribute("aria-label") ?? ""} ${el.closest("label")?.textContent ?? ""} ${forLabel ?? ""} ${el.textContent ?? ""}`;
    });
    if (name.test(label)) return;
  }
  throw new Error(`could not reach ${name} with Tab`);
}

test("skip link, then prepare and share a section using only the keyboard", async ({ page }) => {
  await page.goto("/home");
  await page.waitForFunction(() => localStorage.getItem("ks_lang") !== null);
  await page.evaluate(() => localStorage.setItem("ks_lang", "en"));
  await page.goto("/prepare");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main")).toBeFocused();
  await tabTo(page, /^\s*Share\s*$/);
  await page.keyboard.press("Enter");
  await expect(page.getByText("Nothing is shared.")).toBeVisible();
  await tabTo(page, /My questions/);
  await page.keyboard.press("Space");
  await expect(page.getByText("The sections you switched on can be read by the demo counsellor.")).toBeVisible();
  await expect(page.getByText("Saved")).toBeVisible();
});
