import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../../../supabase/migrations/20261109160000_elovio_usage_limits.sql", import.meta.url),
  "utf8",
);

test("shared API quota is owner-scoped, atomic and capability-bounded", () => {
  assert.match(migration, /auth\.uid\(\)/i);
  assert.match(migration, /primary key \(user_id, capability\)/i);
  assert.match(migration, /interval '60 seconds'/i);
  assert.match(migration, /when 'tutor' then 12/i);
  assert.match(migration, /when 'translation' then 30/i);
  assert.match(migration, /when 'speech' then 12/i);
  assert.match(migration, /when 'asr' then 6/i);
  assert.match(migration, /grant execute .* to authenticated/i);
  assert.doesNotMatch(migration, /grant .* on table public\.elovio_usage_limits to authenticated/i);
});

test("shared API quota cannot be called with an unsupported capability", () => {
  assert.match(migration, /unsupported usage capability/i);
  assert.match(migration, /revoke all on function public\.elovio_consume_usage\(text\) from public, anon/i);
});
