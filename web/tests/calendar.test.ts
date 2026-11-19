import { expect, test } from "vitest";
import { googleUrl, ics, outlookUrl, SUMMARY } from "../lib/calendar";
import { DATA } from "../lib/fixtures";

const START = 1_793_923_200; // a fixed synthetic slot
const VIDEO = "https://meet.jit.si/KinSight-0123456789abcdef01234567";

test("the .ics file follows RFC 5545: CRLF lines, folded at 75 octets, one event with the required fields", () => {
  const text = ics({ id: "demo-booking-1", start: START, video: VIDEO, now: START - 86400 });
  expect(text.endsWith("\r\n")).toBe(true);
  const lines = text.split("\r\n").slice(0, -1);
  for (const line of lines) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  const unfolded = text.replace(/\r\n /g, "").split("\r\n");
  expect(unfolded[0]).toBe("BEGIN:VCALENDAR");
  expect(unfolded.at(-2)).toBe("END:VCALENDAR");
  for (const field of ["VERSION:2.0", "PRODID:", "BEGIN:VEVENT", "UID:demo-booking-1@", "DTSTAMP:", "DTSTART:20261106T000000Z", "DTEND:20261106T004500Z", `SUMMARY:${SUMMARY}`, "END:VEVENT"]) {
    expect(unfolded.some((l) => l.startsWith(field))).toBe(true);
  }
});

test("no condition, gene or result words appear in any calendar text", () => {
  const texts = [ics({ id: "b", start: START, video: VIDEO }), googleUrl(START, 45, VIDEO), outlookUrl(START, 45, VIDEO)].map((t) => decodeURIComponent(t).toLowerCase());
  const banned = ["carrier", "gene", "variant", "result", "risk", "condition", "disorder", "affected", "tier",
    ...DATA.cohort.carriers.flatMap((c) => [c.condition_id.toLowerCase(), c.label_en.toLowerCase()])];
  for (const t of texts) for (const word of banned) expect(t, word).not.toContain(word);
});
