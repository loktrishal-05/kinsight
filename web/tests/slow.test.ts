import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { SLOW_EVENT, trackSlow } from "../lib/slow";

const events: boolean[] = [];
const listener = (e: Event) => events.push((e as CustomEvent<{ slow: boolean }>).detail.slow);

beforeEach(() => {
  vi.useFakeTimers();
  events.length = 0;
  const target = new EventTarget();
  vi.stubGlobal("window", target);
  target.addEventListener(SLOW_EVENT, listener);
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

test("fast calls never announce", async () => {
  const p = trackSlow(Promise.resolve(1));
  await expect(p).resolves.toBe(1);
  expect(events).toEqual([]);
});

test("a call pending past the threshold announces once, then clears when it finishes", async () => {
  let done!: (v: string) => void;
  const slow = trackSlow(new Promise<string>((r) => { done = r; }), 4000);
  const second = trackSlow(new Promise<string>((r) => setTimeout(() => r("b"), 6000)), 4000);
  await vi.advanceTimersByTimeAsync(4100);
  expect(events).toEqual([true]);          // one announcement for two slow calls
  await vi.advanceTimersByTimeAsync(2500);
  await second;
  expect(events).toEqual([true]);          // the first call is still waiting
  done("a");
  await slow;
  expect(events).toEqual([true, false]);
});

test("a failing slow call still clears the notice", async () => {
  const failing = trackSlow(new Promise((_, rej) => setTimeout(() => rej(new Error("503")), 5000)), 4000);
  const caught = failing.catch((e) => e.message);
  await vi.advanceTimersByTimeAsync(5100);
  expect(await caught).toBe("503");
  expect(events).toEqual([true, false]);
});
