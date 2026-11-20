import { expect, test } from "@playwright/test";

test("replacement reading hides results and preserves the existing draft and its source until use", async ({ page }) => {
  await page.addInitScript(() => {
    const read = Blob.prototype.text;
    Blob.prototype.text = async function () {
      if (this instanceof File && this.name === "replacement.tsv") {
        await new Promise<void>((resolve) => window.addEventListener("finish-report-read", () => resolve(), { once: true }));
      }
      return read.call(this);
    };
  });
  await page.goto("/report-compare");
  const first = page.getByRole("textbox", { name: "Partner A report" });
  const file = page.getByLabel("Attach Partner A report");
  const compare = page.getByRole("button", { name: "Compare findings" });
  const original = "CFTR\tCystic fibrosis\tCarrier\tOriginal";
  await file.setInputFiles({ name: "source.tsv", mimeType: "text/plain", buffer: Buffer.from(original) });
  await page.getByRole("button", { name: "Use suggested findings" }).click();
  await page.getByRole("textbox", { name: "Partner B report" }).fill("CFTR | Cystic fibrosis | Not detected");
  for (const check of await page.getByRole("group", { name: "Finding 1" }).getByRole("checkbox").all()) await check.check();
  await compare.click();
  const heading = page.getByRole("heading", { name: "Reported findings" });
  await expect(heading).toBeVisible();

  await file.setInputFiles({ name: "invalid.pdf", mimeType: "application/pdf", buffer: Buffer.from("invalid") });
  await expect(page.getByText("The PDF could not be read", { exact: false })).toBeVisible();
  await expect(heading).toHaveCount(0);
  await expect(first).toHaveValue(original);
  await compare.click();
  await expect(heading).toBeVisible();

  const replacement = "HBB\tBeta thalassemia\tCarrier\tReplacement";
  await file.setInputFiles({ name: "replacement.tsv", mimeType: "text/plain", buffer: Buffer.from(replacement) });
  await expect(heading).toHaveCount(0);
  await expect(compare).toBeDisabled();
  await expect(first).toHaveValue(original);
  await page.evaluate(() => window.dispatchEvent(new Event("finish-report-read")));
  const useReplacement = page.getByRole("button", { name: "Replace current text with suggested findings" });
  await expect(useReplacement).toBeVisible();
  await expect(page.getByRole("group", { name: "Finding 1" })).toContainText(/Extracted text.*Original/);
  await useReplacement.click();
  await expect(first).toHaveValue(replacement);
  await expect(page.getByRole("group", { name: "Finding 1" })).toContainText(/Extracted text.*Replacement/);
  await expect(compare).toBeDisabled();
});

test("private comparison preserves lab findings and separates missing rows", async ({ page, browser }) => {
  const source = await browser.newPage();
  await source.setContent('<p style="break-after:page">CFTR review-only-marker</p><p>CFTR | Cystic fibrosis | Carrier | review-only-marker</p>');
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
  await expect(page.getByRole("group", { name: "Finding 1" })).toContainText("Extracted text from PDF page 2");
  await expect(page.getByRole("group", { name: "Finding 2" })).toContainText("No unique matching line");
  const drop = await page.evaluateHandle(() => {
    const files = new DataTransfer();
    files.items.add(new File(["Gene\tCondition\tResult\tDetails\nCFTR\tCystic fibrosis\tNot detected\tLimited panel"],
      "findings.tsv", { type: "text/tab-separated-values" }));
    return files;
  });
  await page.getByLabel("Attach Partner B report").locator("xpath=..").dispatchEvent("drop", { dataTransfer: drop });
  await drop.dispose();
  await page.getByRole("button", { name: "Use suggested findings" }).click();
  const compare = page.getByRole("button", { name: "Compare findings" });
  const review = page.getByRole("group", { name: "Finding 1" }).filter({ hasText: "Limited panel" });
  await expect(review).toContainText(/Extracted text.*CFTR/);
  for (const field of ["Gene CFTR", "Condition Cystic fibrosis", "Reported result Not detected", "Details Limited panel"]) {
    await expect(compare).toBeDisabled();
    await review.getByRole("checkbox", { name: field }).check();
  }
  await expect(compare).toBeDisabled();
  for (const check of await page.getByRole("group", { name: /Finding [12]/ }).filter({ hasNotText: "Limited panel" })
    .getByRole("checkbox").all()) {
    await check.check();
  }
  await compare.click();
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
  await expect(compare).toBeDisabled();
  await expect(page.getByRole("alert").filter({ hasText: "Check line 1" })).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
  await second.fill("CFTR | Cystic fibrosis | Not detected");
  await expect(compare).toBeDisabled();
  await expect(page.getByRole("group", { name: "Finding 1" }).filter({ hasText: "Not detected" })
    .getByRole("checkbox", { name: "Gene CFTR" })).not.toBeChecked();
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

test("a synthetic report photo is read locally and awaits manual review", async ({ page, browser }) => {
  test.setTimeout(90_000);
  const source = await browser.newPage({ viewport: { width: 700, height: 230 } });
  await source.setContent('<p style="font: 42px Arial; margin: 30px">CFTR SYNTHETIC REPORT</p>');
  const photo = await source.screenshot({ type: "jpeg", quality: 90 });
  await source.setContent(`<img alt="" src="data:image/jpeg;base64,${photo.toString("base64")}">`);
  const scan = await source.pdf();
  await source.close();
  await page.goto("/report-compare");
  const origin = new URL(page.url()).origin;
  const requests: string[] = [];
  page.on("request", (request) => requests.push(`${request.url()} ${request.method()} ${request.postData() ?? ""}`));
  const file = page.getByLabel("Attach Partner A report");
  for (const attachment of [
    { name: "synthetic.jpg", mimeType: "image/jpeg", buffer: photo },
    { name: "scan.pdf", mimeType: "application/pdf", buffer: scan },
  ]) {
    await file.setInputFiles(attachment);
    await expect(page.getByText(attachment.name, { exact: true })).toBeVisible();
    await expect(page.locator("pre")).toContainText("CFTR SYNTHETIC REPORT", { timeout: 35_000 });
    await expect(page.getByRole("textbox", { name: "Partner A report" })).toBeEmpty();
    await expect(page.getByRole("button", { name: "Use suggested findings" })).toHaveCount(0);
  }
  await page.getByRole("textbox", { name: "Partner A report" }).fill("CFTR | Cystic fibrosis | Carrier");
  await page.getByRole("textbox", { name: "Partner B report" }).fill("CFTR | Cystic fibrosis | Not detected");
  const compare = page.getByRole("button", { name: "Compare findings" });
  const review = page.getByRole("group", { name: "Finding 1" });
  await expect(review).toContainText("No unique matching line");
  await expect(review.getByRole("checkbox")).toHaveCount(3);
  for (const check of await review.getByRole("checkbox").all()) {
    await expect(compare).toBeDisabled();
    await check.check();
  }
  await compare.click();
  await expect(page.getByRole("table")).toContainText("Cystic fibrosis");
  expect(await page.evaluate(() => JSON.stringify([localStorage, sessionStorage]).includes("CFTR SYNTHETIC REPORT"))).toBe(false);
  expect(requests.some((request) => !request.startsWith(`${origin}/`) || /\/api\/|POST|CFTR SYNTHETIC REPORT/.test(request))).toBe(false);
  await file.setInputFiles({ name: "invalid.jpg", mimeType: "image/jpeg", buffer: Buffer.from("not a photo") });
  await expect(page.getByRole("alert").filter({ hasText: "The photo could not be read" })).toBeVisible();
});
