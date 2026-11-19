import { expect, test } from "@playwright/test";

test("private comparison preserves lab findings and separates missing rows", async ({ page, browser }) => {
  const source = await browser.newPage();
  await source.setContent("<p>CFTR review-only-marker</p>");
  const pdf = await source.pdf();
  await source.close();

  await page.goto("/report-compare");
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url() + (request.postData() ?? "")));
  const first = page.getByRole("textbox", { name: "Partner A report" });
  const second = page.getByRole("textbox", { name: "Partner B report" });
  const file = page.getByLabel("Attach Partner A report");
  await file.setInputFiles({ name: "screen.pdf", mimeType: "application/pdf", buffer: pdf });
  await expect(page.locator("pre")).toContainText("CFTR review-only-marker", { timeout: 20_000 });
  await expect(first).toBeEmpty();

  await first.fill("CFTR | Cystic fibrosis | Carrier | review-only-marker\nFMR1 | Fragile X syndrome | Intermediate allele");
  const drop = await page.evaluateHandle(() => {
    const files = new DataTransfer();
    files.items.add(new File(["Gene\tCondition\tResult\tDetails\nCFTR\tCystic fibrosis\tNot detected\tLimited panel"],
      "findings.tsv", { type: "text/tab-separated-values" }));
    return files;
  });
  await page.getByLabel("Attach Partner B report").locator("xpath=..").dispatchEvent("drop", { dataTransfer: drop });
  await drop.dispose();
  await page.getByRole("button", { name: "Use suggested findings" }).click();
  await expect(page.getByRole("button", { name: "Compare findings" })).toBeDisabled();
  await page.getByRole("checkbox", { name: "I checked these findings against the original report." }).check();
  await page.getByRole("button", { name: "Compare findings" }).click();
  await expect(page.getByRole("status")).toContainText("Rows matched by gene and condition name · 1");
  const cftr = page.getByRole("row").filter({ hasText: "Cystic fibrosis" });
  await expect(cftr.getByRole("cell").first()).toContainText("Carrier");
  await expect(cftr.getByRole("cell").last()).toContainText("Limited panel");
  await expect(page.getByRole("row").filter({ hasText: "Fragile X syndrome" })).toContainText("No entry from this report");
  await expect(cftr.getByRole("link", { name: "MedlinePlus · CFTR" })).toHaveAttribute("href", "https://medlineplus.gov/genetics/gene/cftr");
  await page.getByRole("button", { name: /Partner A only/ }).click();
  await expect(cftr).toHaveCount(0);
  await page.getByRole("button", { name: "Show all rows" }).click();
  await page.getByLabel("Finding to explain").selectOption({ label: "Fragile X syndrome · FMR1" });
  const guide = page.getByRole("region", { name: "Ask about these findings" });
  await expect(guide).toContainText("No entry was supplied from this report.");
  await guide.getByRole("button", { name: "Can I compare the tests directly?" }).click();
  await expect(guide).toContainText("Panels may cover different variants");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await second.fill("invalid line");
  await expect(page.getByRole("button", { name: "Compare findings" })).toBeDisabled();
  await page.getByRole("checkbox", { name: "I checked these findings against the original report." }).check();
  await page.getByRole("button", { name: "Compare findings" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Check line 1" })).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
  await page.getByRole("button", { name: "Clear reports" }).click();
  await expect(first).toBeEmpty();
  await expect(second).toBeEmpty();
  await expect(page.locator("pre")).toHaveCount(0);
  await file.setInputFiles({ name: "invalid.pdf", mimeType: "application/pdf", buffer: Buffer.from("not a PDF") });
  await expect(page.getByRole("alert").filter({ hasText: "The PDF could not be read" })).toBeVisible();
  expect(requests.some((request) => request.includes("review-only-marker") || request.includes("/api/"))).toBe(false);
  expect(await page.evaluate(() => JSON.stringify([localStorage, sessionStorage]).includes("review-only-marker"))).toBe(false);
});

test("oversized PDFs and page counts are rejected before showing report text", async ({ page, browser }) => {
  const source = await browser.newPage();
  await source.setContent(Array.from({ length: 41 }, (_, i) =>
    `<div style="break-after:page">Synthetic report page ${i + 1}</div>`).join(""));
  const pages = await source.pdf();
  await source.close();

  await page.goto("/report-compare");
  const file = page.getByLabel("Attach Partner A report");
  const cases = { "size-limit.pdf": Buffer.concat([Buffer.from("%PDF-"), Buffer.alloc(10 * 1024 * 1024)]),
    "page-limit.pdf": pages };
  for (const [name, buffer] of Object.entries(cases)) {
    await file.setInputFiles({ name, mimeType: "application/pdf", buffer });
    await expect(page.getByText(name, { exact: true })).toBeVisible();
    await expect(page.getByRole("alert").filter({ hasText: "at most 40 pages" })).toBeVisible();
    await expect(page.locator("pre")).toHaveCount(0);
    await expect(page.getByRole("textbox", { name: "Partner A report" })).toBeEmpty();
  }
});
