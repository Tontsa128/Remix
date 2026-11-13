export function normalizeStudyAnswer(value) {
    return value.trim().toLocaleLowerCase().normalize("NFC").replace(/\s+/g, " ");
}
export function isStudyAnswerCorrect(answer, expected) {
    return normalizeStudyAnswer(answer) === normalizeStudyAnswer(expected);
}
