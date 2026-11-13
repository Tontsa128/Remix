import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_TEST_URL;
const anonKey = process.env.SUPABASE_TEST_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceRoleKey) {
  throw new Error(
    "Set SUPABASE_TEST_URL, SUPABASE_TEST_ANON_KEY and SUPABASE_TEST_SERVICE_ROLE_KEY for a disposable development Supabase project. Never use production credentials.",
  );
}

const admin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const userAEmail = `rls-a-${randomUUID()}@example.com`;
const userBEmail = `rls-b-${randomUUID()}@example.com`;
const password = `Rls-test-${randomUUID()}-Aa1!`;
let userAId: string | undefined;
let userBId: string | undefined;

async function createTestUser(email: string) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw error ?? new Error("Test user creation failed");
  return data.user;
}

async function main() {
  try {
    const userA = await createTestUser(userAEmail);
    userAId = userA.id;
    const userB = await createTestUser(userBEmail);
    userBId = userB.id;

    const clientA = createClient(url!, anonKey!, { auth: { persistSession: false, autoRefreshToken: false } });
    const clientB = createClient(url!, anonKey!, { auth: { persistSession: false, autoRefreshToken: false } });
    const [loginA, loginB] = await Promise.all([
      clientA.auth.signInWithPassword({ email: userAEmail, password }),
      clientB.auth.signInWithPassword({ email: userBEmail, password }),
    ]);
    assert.equal(loginA.error, null, "user A must sign in");
    assert.equal(loginB.error, null, "user B must sign in");

    const { error: progressInsertError } = await clientA.from("learner_progress").upsert({
      user_id: userAId,
      schema_version: 1,
      progress: { schemaVersion: 1, testMarker: "user-a-private" },
    });
    assert.equal(progressInsertError, null, "user A can write their own progress");

    const { data: ownProgress, error: ownProgressError } = await clientA
      .from("learner_progress").select("user_id,progress").eq("user_id", userAId).single();
    assert.equal(ownProgressError, null, "user A can read their own progress");
    assert.equal(ownProgress.user_id, userAId);

    const { data: hiddenProgress, error: hiddenProgressError } = await clientB
      .from("learner_progress").select("user_id,progress").eq("user_id", userAId);
    assert.equal(hiddenProgressError, null);
    assert.deepEqual(hiddenProgress, [], "user B cannot read user A progress");

    const { data: modifiedProgress, error: crossProgressUpdateError } = await clientB
      .from("learner_progress")
      .update({ progress: { schemaVersion: 1, testMarker: "tampered" } })
      .eq("user_id", userAId).select("user_id");
    assert.equal(crossProgressUpdateError, null);
    assert.deepEqual(modifiedProgress, [], "user B cannot modify user A progress");

    const { error: crossInsertError } = await clientB.from("learner_progress").insert({
      user_id: userAId,
      schema_version: 1,
      progress: { schemaVersion: 1, testMarker: "forged" },
    });
    assert.ok(crossInsertError, "user B cannot insert a row owned by user A");

    const { data: ownPreferences, error: ownPreferencesError } = await clientA
      .from("user_language_preferences").select("user_id").eq("user_id", userAId).single();
    assert.equal(ownPreferencesError, null, "auth trigger creates user A preferences");
    assert.equal(ownPreferences.user_id, userAId);

    const { data: hiddenPreferences, error: hiddenPreferencesError } = await clientB
      .from("user_language_preferences").select("user_id").eq("user_id", userAId);
    assert.equal(hiddenPreferencesError, null);
    assert.deepEqual(hiddenPreferences, [], "user B cannot read user A preferences");

    const { data: modifiedPreferences, error: crossPreferencesUpdateError } = await clientB
      .from("user_language_preferences")
      .update({ learning_language: "en" })
      .eq("user_id", userAId).select("user_id");
    assert.equal(crossPreferencesUpdateError, null);
    assert.deepEqual(modifiedPreferences, [], "user B cannot modify user A preferences");

    const { data: ownProfile, error: ownProfileError } = await clientA
      .from("profiles").select("id").eq("id", userAId).single();
    assert.equal(ownProfileError, null, "user A can read their own profile");
    assert.equal(ownProfile.id, userAId);

    const { data: hiddenProfile, error: hiddenProfileError } = await clientB
      .from("profiles").select("id").eq("id", userAId);
    assert.equal(hiddenProfileError, null);
    assert.deepEqual(hiddenProfile, [], "user B cannot read user A profile");

    const { data: modifiedProfile, error: crossProfileUpdateError } = await clientB
      .from("profiles").update({ display_name: "unauthorized" }).eq("id", userAId).select("id");
    assert.equal(crossProfileUpdateError, null);
    assert.deepEqual(modifiedProfile, [], "user B cannot modify user A profile");

    const { error: rateLimitTableReadError } = await clientB
      .from("elovio_usage_limits").select("*").limit(1);
    assert.ok(rateLimitTableReadError, "authenticated clients cannot directly read usage quota rows");

    console.log("Supabase RLS integration checks passed for profiles, language preferences, learner progress and quota isolation.");
  } finally {
    const cleanup = await Promise.allSettled([
      ...(userAId ? [admin.auth.admin.deleteUser(userAId)] : []),
      ...(userBId ? [admin.auth.admin.deleteUser(userBId)] : []),
    ]);
    for (const result of cleanup) {
      if (result.status === "rejected" || result.value.error) {
        console.error("RLS test user cleanup failed; remove temporary user in Supabase Auth dashboard.", result);
      }
    }
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
