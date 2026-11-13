import { CAFE_DIALOGUE } from "../content/cafe-dialogue";
export function isCorrectCafeDialogueResponse(turnIndex:number,optionId:string):boolean{return CAFE_DIALOGUE[turnIndex]?.options.some(option=>option.id===optionId&&option.correct)??false;}
export function getCafeDialogueTurn(turnIndex:number){return CAFE_DIALOGUE[turnIndex]??null;}
