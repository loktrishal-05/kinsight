import { afterEach, expect, test, vi } from "vitest";
import { real } from "../lib/real";

afterEach(() => vi.unstubAllGlobals());

test("keeps access denials distinct from request failures", async () => {
  // 403: not shared or not released (a normal state); 401 that survives a quiet sign-in, and 503: real failures.
  const respond = (assessment: number) => vi.fn(async (url: string) => {
    if (url === "/api/me/consents") return Response.json([]);
    if (url === "/api/auth/persona") return new Response(null, { status: 500 });
    return new Response(null, { status: assessment });
  });
  vi.stubGlobal("fetch", respond(403));
  await expect(real.couple()).resolves.toMatchObject({ tier: null, findings: null, you_shared: false });
  vi.stubGlobal("fetch", respond(401));
  await expect(real.couple()).rejects.toThrow("401");
  vi.stubGlobal("fetch", respond(503));
  await expect(real.couple()).rejects.toThrow("503");
});

test("distinguishes restricted findings from a released empty list", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json({ tier: 1 }))
    .mockResolvedValueOnce(Response.json({ tier: 1, findings: [] })));
  await expect(real.couple()).resolves.toMatchObject({ tier: 1, findings: null });
  await expect(real.couple()).resolves.toMatchObject({ tier: 1, findings: [] });
});
