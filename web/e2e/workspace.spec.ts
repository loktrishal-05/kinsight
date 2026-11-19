import { expect, test } from "@playwright/test";

// A counsellor triages five cases with the keyboard only, then approves the open decision.
test("keyboard triage: j/k through five cases, search, help, and approve with a", async ({ page }) => {
  await page.goto("/home");
  await page.waitForFunction(() => localStorage.getItem("ks_lang") !== null);
  await page.evaluate(() => { localStorage.setItem("ks_lang", "en"); sessionStorage.setItem("ks_persona", "counsellor"); localStorage.setItem("ks_persona", "counsellor");
    sessionStorage.setItem("ks_mock", JSON.stringify({ pooled: { a: true, b: true }, released: false })); });
  await page.goto("/counsellor");
  const selected = page.locator("[data-demo=queue] tbody tr[aria-selected=true]");
  await expect(selected).toHaveCount(1);
  await page.locator("body").click({ position: { x: 1, y: 1 } });
  const seen = new Set<string>();
  for (let i = 0; i < 5; i++) {
    seen.add(await selected.getAttribute("id") ?? "");
    await page.keyboard.press("j");
  }
  expect(seen.size).toBe(5);
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-demo=case] h2")).toBeFocused();
  await page.keyboard.press("?");
  await expect(page.locator("[data-demo=ws-help]")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-demo=ws-help]")).toHaveCount(0);
  await page.keyboard.press("/");
  await expect(page.getByRole("textbox", { name: "Search cases" }).or(page.locator("[data-demo=queue] input").first())).toBeFocused();
  await page.keyboard.type("demo");
  await page.keyboard.press("Escape");
  await page.locator("[data-demo=queue] tbody tr").first().focus();
  await page.keyboard.press("Enter");
  await page.locator("[data-demo=case] h2").focus();
  await page.keyboard.press("a");
  await expect(page.locator("[data-demo=ws-status]")).toHaveText("Approved demo-case");
  await expect(page.url()).toContain("q=demo"); // filters are kept in the URL
});
