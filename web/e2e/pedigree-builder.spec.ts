import { expect, test } from "@playwright/test";

test("the family tree editor adds, edits and saves a relative", async ({ page }) => {
  await page.goto("/home");
  await page.waitForFunction(() => localStorage.getItem("ks_lang") !== null);
  await page.evaluate(() => { localStorage.setItem("ks_lang", "en"); sessionStorage.setItem("ks_persona", "person_a"); localStorage.setItem("ks_persona", "person_a"); });
  await page.goto("/family");
  await page.getByRole("button", { name: "Edit the family tree" }).click();
  const builder = page.locator("[data-demo=builder]");
  const before = await builder.locator("tbody tr").count();
  const form = builder.getByRole("form", { name: "Add relative" });
  await form.getByLabel("Relation").selectOption("sibling");
  await form.getByLabel("Name").fill("Aunt Mira");
  await form.getByLabel("Name").press("Enter"); // keyboard submit
  await expect(builder.locator("tbody tr")).toHaveCount(before + 1);
  await builder.getByLabel("Living Aunt Mira").uncheck();
  await builder.getByLabel("Tested Aunt Mira").selectOption("not_tested");
  await builder.getByRole("button", { name: "Save the family tree" }).click();
  await expect(builder.getByText("Saved", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Edit the family tree" }).click();
  await expect(page.locator("[data-demo=builder] tbody tr")).toHaveCount(before + 1);
  await page.locator("[data-demo=builder]").getByRole("button", { name: "Check how closely they are related" }).click();
  await expect(page.locator("[data-demo=relatedness] [role=alert]")).toContainText("KinSight service"); // mock mode: the engine runs on the API
});

test("the open editor has no WCAG A/AA violations, in English and Arabic", async ({ page }) => {
  const AxeBuilder = (await import("@axe-core/playwright")).default;
  for (const lang of ["en", "ar"]) {
    await page.goto("/home");
    await page.waitForFunction(() => localStorage.getItem("ks_lang") !== null);
    await page.evaluate((l) => { localStorage.setItem("ks_lang", l); sessionStorage.setItem("ks_persona", "person_a"); localStorage.setItem("ks_persona", "person_a"); }, lang);
    await page.goto("/family");
    await page.locator("[data-demo=edit-tree]").click();
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    expect(violations.map((v) => `${lang}: ${v.id} ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
  }
});
