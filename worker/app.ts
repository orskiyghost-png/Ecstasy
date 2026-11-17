import { Hono } from "hono";
import type { Env } from "./env";

export function createApp() {
  const app = new Hono<{ Bindings: Env }>();

  app.get("/api/health", async (context) => {
    const database = context.env?.DB;

    if (!database) {
      return context.json(
        { status: "degraded", database: "unavailable" },
        503,
      );
    }

    try {
      await database.prepare("SELECT 1").first();
      return context.json({ status: "ok", database: "available" });
    } catch {
      return context.json(
        { status: "degraded", database: "unavailable" },
        503,
      );
    }
  });

  return app;
}
