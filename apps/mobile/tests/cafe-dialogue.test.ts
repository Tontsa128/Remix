import assert from "node:assert/strict";
import test from "node:test";
import {CAFE_DIALOGUE} from "../src/content/cafe-dialogue";
import {getCafeDialogueTurn,isCorrectCafeDialogueResponse} from "../src/services/cafe-dialogue";
test("café dialogue has four localized situations with one correct answer each",()=>{
 assert.equal(CAFE_DIALOGUE.length,4);
 for(const [index,turn] of CAFE_DIALOGUE.entries()){
  assert.ok(turn.prompt.fi&&turn.prompt.es&&turn.prompt.en);
  assert.equal(turn.options.filter(option=>option.correct).length,1);
  for(const option of turn.options)for(const language of ["fi","es","en"] as const){assert.ok(option.text[language].trim());assert.ok(option.feedback[language].trim());}
  assert.equal(isCorrectCafeDialogueResponse(index,turn.options.find(option=>option.correct)!.id),true);
 }
});
test("dialogue validator rejects distractors and invalid turns",()=>{
 assert.equal(isCorrectCafeDialogueResponse(0,"directions"),false);
 assert.equal(isCorrectCafeDialogueResponse(99,"coffee-milk"),false);
 assert.equal(getCafeDialogueTurn(0)?.id,"greeting");
 assert.equal(getCafeDialogueTurn(4),null);
});
