import { expect, test } from "@playwright/test";

// Landing: the 3D lattice hero loads without errors or sideways scroll, the scroll beats appear in order, and reduced motion
// gets a static page with every beat readable.
test("hero renders, beats follow the scroll, no errors or horizontal scroll", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByTestId("demo-start")).toBeVisible();
  const go = (f: number) => page.evaluate((f) => {
    const s = document.querySelector('[aria-labelledby="hero-title"]') as HTMLElement;
    scrollTo(0, s.offsetTop + (s.offsetHeight - innerHeight) * f);
  }, f);
  for (const [f, i] of [[0.22, 0], [0.47, 1], [0.85, 2]] as const) {
    await go(f);
    await expect(page.getByRole("heading", { level: 2 }).nth(i)).toBeVisible();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test("reduced motion: no scroll scrub, every beat listed", async ({ browser }) => {
  const page = await browser.newPage({ reducedMotion: "reduce" });
  await page.goto("/");
  const section = page.locator('[aria-labelledby="hero-title"]');
  await expect.poll(() => section.evaluate((s) => s.getBoundingClientRect().height <= innerHeight)).toBe(true);
  for (const t of ["Your result stays behind your own screen", "Every family is a tree", "That becomes a chance"]) {
    await expect(page.getByRole("heading", { name: new RegExp(t) })).toBeVisible();
  }
  await page.close();
});
