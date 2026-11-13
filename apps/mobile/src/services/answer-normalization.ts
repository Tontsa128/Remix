export function normalizeStudyAnswer(value: string): string {
  return value.trim().toLocaleLowerCase().normalize("NFC").replace(/\s+/g, " ");
}

export function isStudyAnswerCorrect(answer: string, expected: string): boolean {
  return normalizeStudyAnswer(answer) === normalizeStudyAnswer(expected);
}
