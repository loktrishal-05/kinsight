import { expect, test } from "vitest";
import { csv } from "../components/ChartCard";

test("CSV of aggregates: hidden cells are empty, text is quoted, rows end with CRLF", () => {
  expect(csv([["Group", "Count"], ["Tier 1", 120], ["Tier 3", null], ['Say "hi", ok', 12]]))
    .toBe('Group,Count\r\nTier 1,120\r\nTier 3,\r\n"Say ""hi"", ok",12');
});
