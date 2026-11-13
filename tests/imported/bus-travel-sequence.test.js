import assert from "node:assert/strict";
import test from "node:test";
import { BUS_TRAVEL_SEQUENCE } from "../../src/imported/content/bus-travel-sequence";
import { createBusTravelSequenceRound, isNextBusTravelStep } from "../../src/imported/services/bus-travel-sequence";
test("bus travel sequence has four unique ordered steps with Finnish, Spanish and English content", () => {
    assert.equal(BUS_TRAVEL_SEQUENCE.length, 4);
    assert.deepEqual(BUS_TRAVEL_SEQUENCE.map((step) => step.order), [1, 2, 3, 4]);
    assert.equal(new Set(BUS_TRAVEL_SEQUENCE.map((step) => step.id)).size, 4);
    for (const step of BUS_TRAVEL_SEQUENCE) {
        for (const language of ["fi", "es", "en"]) {
            assert.ok(step.words[language].trim(), step.id + " word " + language);
            assert.ok(step.description[language].trim(), step.id + " description " + language);
        }
    }
});
test("bus travel sequence accepts only the next correct step", () => {
    assert.equal(isNextBusTravelStep("check-route", 0), true);
    assert.equal(isNextBusTravelStep("buy-ticket", 0), false);
    assert.equal(isNextBusTravelStep("wait-bus", 2), true);
    assert.equal(isNextBusTravelStep("board-bus", 4), false);
});
test("bus travel round shuffles choices while preserving every unique step", () => {
    const round = createBusTravelSequenceRound(() => 0);
    assert.equal(round.optionIds.length, BUS_TRAVEL_SEQUENCE.length);
    assert.equal(new Set(round.optionIds).size, BUS_TRAVEL_SEQUENCE.length);
    assert.deepEqual([...round.optionIds].sort(), BUS_TRAVEL_SEQUENCE.map((step) => step.id).sort());
    assert.notDeepEqual(round.optionIds, BUS_TRAVEL_SEQUENCE.map((step) => step.id));
});
