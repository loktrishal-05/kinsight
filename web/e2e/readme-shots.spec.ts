import { test, type Page } from "@playwright/test";

// Regenerates the README screenshots: SHOTS=1 npx playwright test e2e/readme-shots.spec.ts --project=desktop
// Skipped in normal runs and CI. Fictional data only.
const OUT = "../docs/screenshots";
test.skip(!process.env.SHOTS, "set SHOTS=1 to regenerate README screenshots");
test.setTimeout(240_000);

const as = async (page: Page, persona: string, lang = "en") => {
  await page.goto("/home");
  await page.waitForFunction(() => localStorage.getItem("ks_lang") !== null);
  if ((await page.evaluate(() => localStorage.getItem("ks_lang"))) !== lang) {
    await page.evaluate((l) => localStorage.setItem("ks_lang", l), lang);
    await page.reload();
  }
  await page.locator("#persona-top").selectOption(persona); // the "Viewing as" switch, as a user would
  await page.waitForLoadState("networkidle");
};
const shot = async (page: Page, name: string, path: string) => {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(600); // let the page-in transition settle
  await page.screenshot({ path: `${OUT}/${name}.jpg`, type: "jpeg", quality: 82 });
};

test("desktop screens", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/01-landing.jpg`, type: "jpeg", quality: 82 });

  await as(page, "person_a");
  await shot(page, "02-home", "/home");
  await shot(page, "03-result", "/result");
  // couple view after both share and the counsellor approves (the demo path)
  await page.goto("/couple");
  await page.getByRole("button", { name: /Share for couple planning/ }).click();
  await as(page, "person_b");
  await page.goto("/couple");
  const share = page.getByRole("button", { name: /Share for couple planning/ });
  if (await share.isVisible()) await share.click();
  await as(page, "counsellor");
  await page.goto("/counsellor");
  await page.getByRole("button", { name: /Approve/ }).first().click();
  await as(page, "person_a");
  await shot(page, "04-couple", "/couple");
  await shot(page, "06-scenarios", "/plan/scenarios");
  await shot(page, "07-prepare", "/prepare");
  await shot(page, "08-family", "/family");
  await shot(page, "09-cascade", "/cascade");
  await shot(page, "10-kin", "/ask");
  await shot(page, "13-privacy", "/privacy");

  await page.goto("/report-compare");
  await page.getByRole("textbox", { name: "Partner A report" }).fill("CFTR | Cystic fibrosis | Carrier\nHBB | Beta thalassaemia | Not detected");
  await page.getByRole("textbox", { name: "Partner B report" }).fill("CFTR | Cystic fibrosis | Carrier\nHBB | Beta thalassaemia | Carrier");
  await page.getByRole("button", { name: "Compare findings" }).click();
  await page.getByRole("button", { name: "Recessive (autosomal recessive)" }).click();
  await page.locator('[data-demo="report-whatif"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/05-report-compare.jpg`, type: "jpeg", quality: 82 });

  await as(page, "counsellor");
  await shot(page, "11-counsellor", "/counsellor");
  await as(page, "analyst");
  await shot(page, "12-analyst", "/analyst");
  await as(page, "auditor");
  await shot(page, "14-governance", "/governance");
  await as(page, "person_a", "ar");
  await shot(page, "15-arabic", "/home");
});

test("phone strip", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await as(page, "person_a"); // the persona switch is in the desktop top bar
  await page.setViewportSize({ width: 390, height: 844 });
  const parts: string[] = [];
  for (const path of ["/home", "/plan/scenarios", "/prepare"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);
    parts.push((await page.screenshot({ type: "png" })).toString("base64"));
  }
  await page.setViewportSize({ width: 1290, height: 900 });
  await page.setContent(`<body style="margin:0;background:#eef2f1;display:flex;gap:30px;justify-content:center;align-items:center;height:900px">
    ${parts.map((b) => `<img src="data:image/png;base64,${b}" style="width:390px;border-radius:28px;box-shadow:0 12px 40px rgba(0,0,0,.18)">`).join("")}</body>`);
  await page.screenshot({ path: `${OUT}/16-phone.jpg`, type: "jpeg", quality: 82 });
});
