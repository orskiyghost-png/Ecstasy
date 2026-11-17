import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../migrations/0002_telegram.sql", import.meta.url),
  "utf8",
);

describe("telegram update migration", () => {
  it("creates an idempotency table without sample data", () => {
    expect(migration).toMatch(/CREATE TABLE IF NOT EXISTS telegram_updates/i);
    expect(migration).toMatch(/update_id INTEGER PRIMARY KEY/i);
    expect(migration).toMatch(/received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP/i);
    expect(migration).not.toMatch(/\bINSERT\s+INTO\b/i);
  });
});
