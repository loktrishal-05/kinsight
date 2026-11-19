import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { expect, test } from "@playwright/test";

test("a lab correction invalidates the open participant view until reviewed", async ({ page, browser }) => {
  test.skip(process.env.NEXT_PUBLIC_LAB_SANDBOX !== "1", "This suite needs the opt-in lab sandbox");
  test.setTimeout(90_000);
  const waitForPoll = expect.configure({ timeout: 12_000 });
  const workstation = await browser.newPage();
  const signedFeed = Boolean(process.env.KINSIGHT_LAB_SIGNING_SECRET);
  const tracker = signedFeed ? await browser.newPage() : undefined;
  const send = async (revision: number) => {
    if (signedFeed) {
      await promisify(execFile)(process.env.PYTHON ?? "python", [
        "-m", "scripts.mock_lab", "--api", process.env.KINSIGHT_API_URL ?? "http://127.0.0.1:8000",
        "--format", "hl7", "--delay", "0", "--revision", String(revision), "--start-stage", revision === 1 ? "2" : "8",
      ], { cwd: resolve(".."), timeout: 20_000 });
      return;
    }
    await workstation.getByRole("button", { name: "Demo operator", exact: true }).click();
    await workstation.getByRole("spinbutton", { name: "Revision" }).fill(String(revision));
    await workstation.getByRole("button", { name: revision === 1 ? "Send final report" : "Send correction" }).click();
    await expect(workstation.getByText("Lab report received")).toBeVisible();
  };
  try {
    await page.goto("/lab-sandbox");
    await workstation.goto("/lab-sandbox");
    await page.getByRole("button", { name: "Share for review" }).click();
    await expect(page.getByText("Shared for review", { exact: true })).toBeVisible();
    if (tracker) {
      await tracker.goto("/journey");
      await expect(tracker.locator('li[aria-current="step"]')).toContainText("Booked");
    }
    if (tracker) {
      const runLab = promisify(execFile)(process.env.PYTHON ?? "python", [
        "-m", "scripts.mock_lab", "--api", process.env.KINSIGHT_API_URL ?? "http://127.0.0.1:8000",
        "--format", "hl7", "--delay", "6",
      ], { cwd: resolve(".."), timeout: 50_000 });
      await Promise.all([
        waitForPoll(tracker.locator('li[aria-current="step"]')).toContainText("Collected"),
        runLab,
      ]);
      await waitForPoll(tracker.locator('li[aria-current="step"]')).toContainText("Report signed");
      await expect(tracker.locator('li[aria-current="step"] time')).toBeVisible();
    } else {
      await send(1);
    }
    await waitForPoll(page.getByText("Awaiting counsellor review · Revision 1")).toBeVisible();
    await expect(page.getByText("Carrier finding", { exact: true })).toHaveCount(0);

    await workstation.getByRole("button", { name: "Counsellor", exact: true }).click();
    await workstation.getByRole("button", { name: "Approve this revision" }).click();
    await waitForPoll(page.getByText("Carrier finding", { exact: true })).toBeVisible();

    await send(2);
    await waitForPoll(page.getByText("Awaiting counsellor review · Revision 2")).toBeVisible();
    await expect(page.getByText("Carrier finding", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Uncertain finding", { exact: true })).toHaveCount(0);

    await workstation.getByRole("button", { name: "Counsellor", exact: true }).click();
    await expect(workstation.getByText("Uncertain finding", { exact: true })).toBeVisible();
    await workstation.getByRole("button", { name: "Approve this revision" }).click();
    await waitForPoll(page.getByText("Uncertain finding", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Person B", exact: true }).click();
    await expect(page.getByText("No lab report yet")).toBeVisible();
  } finally {
    await tracker?.close();
    await workstation.close();
  }
});
