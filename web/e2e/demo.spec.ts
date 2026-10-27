import { expect, test, type Page } from "@playwright/test";

// Guided demo: the full 42-step run in fast mode (en from the hero, ar from ?demo=ar), the caption controls, and narration
// with a stubbed speechSynthesis. Every step performs its real action, so the action notes in window.__demoLog prove coverage.
const NOTES = [
  "counsellor:approved", "close:refused", "couple:released", "quiz:reexplain", "quiz:passed",
  "consent:revoked", "kin:arabic", "theme:dark", "audit:tamper-detected", "demo:done",
];
const FAST = () => { try { localStorage.setItem("ks_demo_fast", "1"); } catch { /* ignore */ } };
const SPEECH = () => {
  const w = window as any;
  w.__spoken = [];
  w.SpeechSynthesisUtterance = class { text: string; lang = ""; voice: any; rate = 1; onstart: any; onend: any; onerror: any; constructor(t: string) { this.text = t; } };
  Object.defineProperty(window, "speechSynthesis", { configurable: true, value: {
    getVoices: () => [{ lang: "en-US", name: "stub-en" }, { lang: "ar-AE", name: "stub-ar" }],
    speak(u: any) { w.__spoken.push({ text: u.text, lang: u.lang }); setTimeout(() => { u.onstart?.(); u.onend?.(); }, 20); },
    cancel() {}, addEventListener() {}, removeEventListener() {},
  } });
};
const demoLog = (page: Page) => page.evaluate(() => ((window as any).__demoLog ?? []) as string[]);
const caption = (page: Page) => page.getByTestId("demo-caption");

test.describe("full run", () => {
  test.setTimeout(240_000);
  test.beforeEach(async ({ page }) => { await page.addInitScript(FAST); });

  const expectComplete = async (page: Page) => {
    await expect(page.getByTestId("demo-done")).toBeVisible({ timeout: 200_000 });
    const log = await demoLog(page);
    expect(log.filter((n) => n.startsWith("error:"))).toEqual([]);
    for (const n of NOTES) expect(log, n).toContain(n);
    await expect(page.getByTestId("demo-covered").locator("li")).toHaveCount(42);
  };

  test("starts from the hero and every step's action succeeds", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("demo-start").click();
    await expectComplete(page);
    await page.getByRole("button", { name: "Explore on my own" }).click();
    await expect(page.getByTestId("demo-done")).toBeHidden();
  });

  test("runs in Arabic from ?demo=ar", async ({ page }) => {
    await page.goto("/?demo=ar");
    await expect(caption(page).locator("[dir=rtl]")).toBeVisible();
    await expectComplete(page);
    await expect(page.getByTestId("demo-done")).toHaveAttribute("dir", "rtl");
  });
});

test("pause, next, previous and stop controls", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("demo-start").click();
  await expect(caption(page)).toHaveAttribute("data-step", "intro");
  await page.getByTestId("demo-toggle").click();
  await expect(page.getByTestId("demo-toggle")).toHaveAttribute("aria-label", "Play");
  await page.getByRole("button", { name: "Next step" }).click();
  await expect(caption(page)).toHaveAttribute("data-step", "how");
  await page.waitForTimeout(1500); // paused: it must not advance on its own
  await expect(caption(page)).toHaveAttribute("data-step", "how");
  await page.getByRole("button", { name: "Previous step" }).click();
  await expect(caption(page)).toHaveAttribute("data-step", "intro");
  await page.getByTestId("demo-toggle").click();
  await expect(page.getByTestId("demo-toggle")).toHaveAttribute("aria-label", "Pause");
  await page.getByRole("button", { name: "Stop the demo" }).click();
  await expect(caption(page)).toBeHidden();
});

test("narration speaks each step's caption", async ({ page }) => {
  await page.addInitScript(SPEECH);
  await page.goto("/");
  await page.getByTestId("demo-start").click();
  await page.getByRole("button", { name: "Narrate aloud" }).click();
  await expect(page.getByRole("button", { name: "Narrate aloud" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Next step" }).click();
  await expect(caption(page)).toHaveAttribute("data-step", "how");
  const text = (await caption(page).locator("p.text-sm").textContent())!.trim();
  await expect.poll(() => page.evaluate(() => (window as any).__spoken as { text: string; lang: string }[]))
    .toContainEqual({ text, lang: "en-US" });
  await page.getByRole("button", { name: "Stop the demo" }).click();
});
