import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = (name: string) =>
  readFileSync(new URL(`../../../supabase/migrations/${name}`, import.meta.url), "utf8");

const identitySql = migration("20261107090000_initial_identity_and_language_preferences.sql");
const progressSql = migration("20261108120000_learner_progress.sql");
const tutorSql = migration("20261108140000_tutor_rate_limits.sql");
const translationSql = migration("20261108150000_interpreter_translation_limits.sql");
const speechSql = migration("20261108160000_interpreter_speech_limits.sql");
const asrSql = migration("20261108170000_interpreter_asr_session_limits.sql");
const sharedUsageSql = migration("20261109160000_elovio_usage_limits.sql");

test("all user-owned tables enable RLS and restrict rows to auth.uid()", () => {
  for (const [table, sql, ownerColumn] of [
    ["profiles", identitySql, "id"],
    ["user_language_preferences", identitySql, "user_id"],
    ["learner_progress", progressSql, "user_id"],
  ] as const) {
    assert.match(sql, new RegExp(String.raw`alter table public\.${table} enable row level security`, "i"));
    assert.match(sql, new RegExp(String.raw`auth\.uid\(\)\)?\s*=\s*${ownerColumn}`, "i"));
    for (const operation of ["select", "insert", "update"]) {
      assert.match(sql, new RegExp(String.raw`on public\.${table} for ${operation}`, "i"));
    }
    assert.doesNotMatch(sql, new RegExp(String.raw`on public\.${table} for delete`, "i"));
    assert.doesNotMatch(sql, new RegExp(String.raw`grant .*delete.* on table public\.${table}`, "i"));
  }
});

test("public language catalogue is read-only to client roles", () => {
  assert.match(identitySql, /alter table public\.languages enable row level security/i);
  assert.match(identitySql, /for select\s+to anon, authenticated\s+using \(is_active = true\)/i);
  assert.match(identitySql, /grant select on table public\.languages to anon, authenticated/i);
  assert.doesNotMatch(identitySql, /grant (insert|update|delete|all).* on table public\.languages to anon, authenticated/i);
});

test("all rate-limit tables deny direct client table access", () => {
  for (const [table, sql] of [
    ["tutor_rate_limits", tutorSql],
    ["interpreter_translation_limits", translationSql],
    ["interpreter_speech_limits", speechSql],
    ["interpreter_asr_session_limits", asrSql],
    ["elovio_usage_limits", sharedUsageSql],
  ] as const) {
    assert.match(sql, new RegExp(String.raw`alter table public\.${table} enable row level security`, "i"));
    assert.match(sql, new RegExp(String.raw`revoke all on table public\.${table} from anon, authenticated`, "i"));
    assert.doesNotMatch(sql, new RegExp(String.raw`grant .* on table public\.${table} to (anon|authenticated)`, "i"));
  }
  for (const sql of [tutorSql, translationSql, speechSql, asrSql]) {
    assert.match(sql, /auth\.uid\(\)/i);
    assert.match(sql, /revoke all on function public\.consume_/i);
    assert.match(sql, /grant execute on function public\.consume_/i);
  }
});

test("learner progress payload is bounded and client cannot delete it", () => {
  assert.match(progressSql, /pg_column_size\(progress\)\s*<=\s*65536/i);
  assert.match(progressSql, /grant select, insert, update/i);
  assert.doesNotMatch(progressSql, /grant .*delete/i);
});

test("fixed-window quota functions cannot be weakened by caller-supplied parameters", () => {
  assert.match(tutorSql, /function public\.consume_tutor_rate_limit\(\)/i);
  assert.match(tutorSql, /interval '60 seconds'/i);
  assert.match(tutorSql, /return v_count <= 12/i);
  assert.doesNotMatch(tutorSql, /p_window_seconds|p_max_requests/i);
  assert.match(sharedUsageSql, /function public\.elovio_consume_usage\(p_capability text\)/i);
  assert.match(sharedUsageSql, /when 'tutor' then 12/i);
  assert.match(sharedUsageSql, /when 'translation' then 30/i);
  assert.match(sharedUsageSql, /when 'speech' then 12/i);
  assert.match(sharedUsageSql, /when 'asr' then 6/i);
  assert.match(sharedUsageSql, /return v_count <= v_limit/i);
  assert.match(sharedUsageSql, /revoke all on function public\.elovio_consume_usage\(text\) from public, anon/i);
  assert.match(sharedUsageSql, /grant execute on function public\.elovio_consume_usage\(text\) to authenticated/i);
});
