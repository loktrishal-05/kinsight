import { expect, test } from "@playwright/test";

test("the counsellor console shows the FHIR referral and syncs a completed Task", async ({ page, browser, request }) => {
  const fhir = process.env.KINSIGHT_FHIR_REFERRAL_URL;
  test.skip(!fhir || process.env.NEXT_PUBLIC_FHIR_REFERRAL !== "1", "Requires the disposable FHIR referral receiver");
  test.setTimeout(75_000);
  await page.goto("/signin");
  await page.getByTestId("signin-submit").click();
  await page.getByRole("button", { name: /^Person A/ }).click();
  const talk = page.getByRole("button", { name: "Talk to a counsellor" });
  await talk.click();
  await expect(page.getByRole("button", { name: "Counselling requested." })).toBeVisible();
  await page.getByRole("button", { name: "Allow sandbox referral" }).click();
  await expect(page.getByRole("button", { name: "Sandbox referral allowed" })).toBeVisible();

  const reviewer = await browser.newPage();
  try {
    await reviewer.goto("/signin");
    await reviewer.getByTestId("signin-submit").click();
    await reviewer.getByRole("button", { name: /^Counsellor/ }).click();
    const approval = reviewer.waitForResponse((r) => r.url().endsWith("/api/counsellor/cases/demo-case/decision"));
    await reviewer.getByRole("button", { name: "Approve", exact: true }).click();
    expect((await (await approval).json()).status).toBe("released");

    // Answer the stable synthetic quiz via its regular endpoint to reach referral tracking.
    const token = await page.evaluate(() => sessionStorage.getItem("ks_tok"));
    const grade = await page.request.post("/api/cases/demo-case/quiz/answers", {
      headers: { authorization: `Bearer ${token}` }, data: { answers: [1, 0, 1, 0, 2] },
    });
    expect((await grade.json()).status).toBe("passed");
    const transition = reviewer.waitForResponse((r) => r.url().endsWith("/referral/events"));
    await reviewer.getByRole("button", { name: "Counselling requested", exact: true }).click();
    expect((await transition).ok()).toBe(true);
    await reviewer.getByRole("button", { name: "Approve and send sandbox referral" }).click();
    await expect(reviewer.getByText("FHIR request ID", { exact: true })).toBeVisible();
    const task = reviewer.locator("dt").filter({ hasText: "FHIR task ID" }).locator("xpath=following-sibling::dd[1]");
    const taskUrl = `${fhir}/Task/${await task.innerText()}`;
    const remote = await request.get(taskUrl);
    expect(remote.ok()).toBe(true);
    const done = await request.put(taskUrl, {
      headers: { "Content-Type": "application/fhir+json" }, data: { ...(await remote.json()), status: "completed" },
    });
    expect(done.ok()).toBe(true);
    await expect(reviewer.getByText("Last synced", { exact: true })).toBeVisible();
    await expect(reviewer.locator("[data-demo=referral] [aria-current=step]")).toContainText(
      "Counselling done", { timeout: 20_000 },
    );
  } finally {
    await reviewer.close();
  }
});
