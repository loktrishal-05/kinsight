import { afterEach, expect, test, vi } from "vitest";

// Demo tokens expire after 15 minutes. A 401 must trigger one quiet sign-in as the same persona and a retry,
// instead of leaving every screen empty (the live-site bug of 20 Nov 2026).
afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

test("an expired token signs in again and the request is retried once", async () => {
  const calls: { url: string; auth?: string }[] = [];
  let issued = 0;
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
    const auth = (init.headers as Record<string, string>).authorization;
    calls.push({ url, auth });
    if (url === "/api/auth/persona") return new Response(JSON.stringify({ access_token: `fresh-${++issued}` }), { status: 200 });
    if (auth === "Bearer fresh-1") return new Response(JSON.stringify([{ condition_id: "COND_001", status: "carrier" }]), { status: 200 });
    return new Response("", { status: 401 });
  }));
  const { real } = await import("@/lib/real");
  const rows = await real.results();
  expect(rows[0].condition_id).toBe("COND_001");
  expect(calls.map((c) => c.url)).toEqual(["/api/me/results", "/api/auth/persona", "/api/auth/persona", "/api/me/results"]);
  expect(calls.at(-1)?.auth).toBe("Bearer fresh-1");
});

test("a refusal that is not 401 is not retried", async () => {
  const fetchMock = vi.fn(async () => new Response("", { status: 403 }));
  vi.stubGlobal("fetch", fetchMock);
  const { real } = await import("@/lib/real");
  await expect(real.results()).rejects.toThrow("403");
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
