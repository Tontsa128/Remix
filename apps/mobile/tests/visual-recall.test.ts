import assert from "node:assert/strict";
import test from "node:test";
import { createVisualRecallRound } from "../src/services/visual-recall";
import { VISUAL_VOCABULARY } from "../src/content/visual-vocabulary";

test("visual recall round uses three unique catalogue-backed images", () => {
  const round = createVisualRecallRound(VISUAL_VOCABULARY, () => 0.4);
  assert.ok(round);
  assert.equal(round.sequenceIds.length, 3);
  assert.equal(new Set(round.sequenceIds).size, 3);
  assert.equal(new Set(round.choiceIds).size, 3);
  assert.deepEqual([...round.sequenceIds].sort(), [...round.choiceIds].sort());
  assert.ok(round.targetPosition >= 0 && round.targetPosition < 3);
});

test("visual recall can be made deterministic for reliable tests", () => {
  const entries = [{ id: "one" }, { id: "two" }, { id: "three" }];
  const first = createVisualRecallRound(entries, () => 0);
  const second = createVisualRecallRound(entries, () => 0);
  assert.deepEqual(first, second);
  assert.deepEqual(first?.sequenceIds, ["two", "three", "one"]);
});

test("visual recall refuses too few or duplicate image identifiers", () => {
  assert.equal(createVisualRecallRound([{ id: "one" }, { id: "two" }]), null);
  assert.equal(createVisualRecallRound([{ id: "same" }, { id: "same" }, { id: "other" }]), null);
});
