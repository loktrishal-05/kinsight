import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";

// The grep check from web/DESIGN.md: pages use PageHeader for their h1 and the shared ErrorState for failures.
const ROOT = join(__dirname, "..", "app");
const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? files(p) : p.endsWith(".tsx") ? [p] : [];
});
// Public pages outside the app shell design their own hero heading.
const OWN_HEADING = ["home", "signin", join("study", "page.tsx"), join("study", "results")].map((x) => join(ROOT, x));

test("app pages take their h1 from PageHeader", () => {
  const offenders = files(ROOT).filter((f) => /<h1[\s>]/.test(readFileSync(f, "utf8")) && !OWN_HEADING.some((o) => f.startsWith(o)));
  expect(offenders).toEqual([]);
});

test("failures use the shared ErrorState, not a bare alert paragraph", () => {
  const offenders = files(ROOT).flatMap((f) => readFileSync(f, "utf8").split("\n").filter((l) => l.includes('<p role="alert">')).map((l) => `${f}: ${l.trim()}`));
  expect(offenders).toEqual([]);
});
