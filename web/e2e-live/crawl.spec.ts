import { expect, test } from "@playwright/test";

// Visits every screen as every role against a live API and reports console errors, failed API calls, raw ids and garbled text.
const ROUTES = ["/home", "/learn", "/result", "/couple", "/understand", "/next", "/access", "/summary", "/family", "/consents", "/privacy", "/ask",
  "/journey", "/plan", "/nasab", "/checkin", "/clinic", "/counsellor", "/analyst", "/governance", "/methods", "/study", "/study/results"];
const ROLES = [/^Person A/, /^Person B/, /^Relative/, /^Counsellor/, /^Analyst/, /^Auditor/];
const GARBLED = /Ã.|â€|Ø.|Ù.|�/;
const problems: string[] = [];

test("crawl every screen as every role", async ({ page }) => {
  test.setTimeout(480_000);
  let where = "";
  page.on("pageerror", (e) => problems.push(`${where}: pageerror ${e.message.slice(0, 120)}`));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) problems.push(`${where}: console ${m.text().slice(0, 120)}`); });
  page.on("response", (r) => {
    const u = r.url();
    if (u.includes("/api/") && r.status() >= 500) problems.push(`${where}: ${r.status()} ${u.replace(/^.*\/api/, "/api")}`);
  });
  await page.goto("/signin"); await page.waitForLoadState("networkidle");
  await page.getByTestId("demo-account").click(); await page.getByTestId("signin-submit").click();
  await expect(page).toHaveURL(/\/home$/);
  for (const role of ROLES) {
    await page.goto("/home"); await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: role }).first().click();
    await page.waitForTimeout(800);
    for (const route of ROUTES) {
      where = `${role.source} ${route}`;
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1500);
      const text = await page.locator("body").innerText();
      if (GARBLED.test(text)) problems.push(`${where}: garbled text`);
      if (/COND_\d{3}|synthetic-[a-z]/.test(text)) problems.push(`${where}: raw id shown`);
      if (/Could not complete|Something went wrong|Application error|Internal Server Error/i.test(text)) problems.push(`${where}: error text`);
      if (text.trim().length < 40) problems.push(`${where}: nearly empty page`);
    }
  }
  console.log("PROBLEMS:\n" + (problems.length ? [...new Set(problems)].join("\n") : "none"));
});
