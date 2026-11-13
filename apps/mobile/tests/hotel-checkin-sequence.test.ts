import assert from "node:assert/strict";
import test from "node:test";
import { HOTEL_CHECKIN_SEQUENCE } from "../src/content/hotel-checkin-sequence";
import { createHotelCheckinRound, isNextHotelCheckinStep } from "../src/services/hotel-checkin-sequence";

test("hotel check-in sequence has four unique ordered and localized steps",()=>{
 assert.equal(HOTEL_CHECKIN_SEQUENCE.length,4);
 assert.deepEqual(HOTEL_CHECKIN_SEQUENCE.map(step=>step.order),[1,2,3,4]);
 assert.equal(new Set(HOTEL_CHECKIN_SEQUENCE.map(step=>step.id)).size,4);
 for(const step of HOTEL_CHECKIN_SEQUENCE)for(const language of ["fi","es","en"] as const){assert.ok(step.words[language].trim());assert.ok(step.description[language].trim());}
});
test("hotel check-in accepts only the next semantic step",()=>{
 assert.equal(isNextHotelCheckinStep("arrive-hotel",0),true);
 assert.equal(isNextHotelCheckinStep("receive-key",0),false);
 assert.equal(isNextHotelCheckinStep("receive-key",2),true);
 assert.equal(isNextHotelCheckinStep("go-room",4),false);
});
test("hotel check-in rounds shuffle all four unique steps",()=>{
 const round=createHotelCheckinRound(()=>0);
 assert.equal(new Set(round.optionIds).size,4);
 assert.deepEqual([...round.optionIds].sort(),HOTEL_CHECKIN_SEQUENCE.map(step=>step.id).sort());
 assert.notDeepEqual(round.optionIds,HOTEL_CHECKIN_SEQUENCE.map(step=>step.id));
});
