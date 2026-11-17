import { Hono } from "hono";
import type { Env } from "./env";
import { handleTelegramSetup } from "./telegram-setup";
import { handleTelegramWebhook } from "./telegram-webhook";
import { handleGetAgent, handleSaveAgent, handleSession } from "./user-api";

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

  app.post("/api/telegram/webhook", (context) =>
    handleTelegramWebhook(context.req.raw, context.env),
  );

  app.post("/api/session", (context) =>
    handleSession(context.req.raw, context.env),
  );

  app.get("/api/agent", (context) =>
    handleGetAgent(context.req.raw, context.env),
  );

  app.put("/api/agent", (context) =>
    handleSaveAgent(context.req.raw, context.env),
  );

  app.post("/api/telegram/setup", (context) =>
    handleTelegramSetup(context.req.raw, context.env),
  );

  return app;
}
