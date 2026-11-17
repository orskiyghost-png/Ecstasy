import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../migrations/0001_initial.sql", import.meta.url),
  "utf8",
);

describe("initial D1 migration", () => {
  it("creates an empty users table with nullable unique Telegram identity", () => {
    expect(migration).toMatch(/CREATE TABLE users/i);
    expect(migration).toMatch(/id INTEGER PRIMARY KEY AUTOINCREMENT/i);
    expect(migration).toMatch(/telegram_user_id TEXT UNIQUE/i);
    expect(migration).toMatch(/created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP/i);
    expect(migration).toMatch(/updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP/i);
    expect(migration).not.toMatch(/\bINSERT\s+INTO\b/i);
  });
});
