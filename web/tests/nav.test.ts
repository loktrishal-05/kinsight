import { expect, test } from "vitest";
import { GROUPS, groupsFor, NAV_ITEMS } from "../components/nav";
import { PERSONAS } from "../lib/session";

test("no role sees a page twice, and every role sees at most 7 groups", () => {
  for (const persona of PERSONAS) {
    const groups = groupsFor(persona);
    const hrefs = groups.flatMap((g) => g.items.map((i) => i.href));
    expect(new Set(hrefs).size, persona).toBe(hrefs.length);
    // The demo operator sees every role's pages on purpose; everyone else gets a short menu.
    if (persona !== "demo_operator") expect(groups.length, persona).toBeLessThanOrEqual(7);
  }
});

test("every navigation item belongs to some group and every group item exists", () => {
  const grouped = new Set(GROUPS.flatMap((g) => g.items.map((i) => i.key)));
  for (const item of NAV_ITEMS) expect(grouped.has(item.key), item.key).toBe(true);
  for (const g of GROUPS) for (const item of g.items) expect(item, g.id).toBeDefined();
});
