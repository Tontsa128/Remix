import { CAFE_DIALOGUE } from "../content/cafe-dialogue";
export function isCorrectCafeDialogueResponse(turnIndex, optionId) { return CAFE_DIALOGUE[turnIndex]?.options.some(option => option.id === optionId && option.correct) ?? false; }
export function getCafeDialogueTurn(turnIndex) { return CAFE_DIALOGUE[turnIndex] ?? null; }
