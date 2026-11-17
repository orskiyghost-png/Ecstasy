import { describe, expect, it, vi } from "vitest";
import { createApp } from "../worker/app";

describe("GET /api/health", () => {
  it("returns healthy status when D1 responds", async () => {
    const first = vi.fn().mockResolvedValue({ value: 1 });
    const prepare = vi.fn().mockReturnValue({ first });
    const app = createApp();

    const response = await app.request(
      "/api/health",
      undefined,
      { DB: { prepare } as unknown as D1Database },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: "ok",
      database: "available",
    });
    expect(prepare).toHaveBeenCalledWith("SELECT 1");
  });

  it("returns degraded status when D1 binding is missing", async () => {
    const app = createApp();
    const response = await app.request("/api/health");

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      status: "degraded",
      database: "unavailable",
    });
  });

  it("returns degraded status when D1 query fails without exposing the error", async () => {
    const first = vi.fn().mockRejectedValue(new Error("database detail"));
    const prepare = vi.fn().mockReturnValue({ first });
    const app = createApp();

    const response = await app.request(
      "/api/health",
      undefined,
      { DB: { prepare } as unknown as D1Database },
    );

    expect(response.status).toBe(503);
    const payload = await response.json();
    expect(payload).toEqual({
      status: "degraded",
      database: "unavailable",
    });
    expect(JSON.stringify(payload)).not.toContain("database detail");
  });
});
