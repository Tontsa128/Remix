import { Pressable, StyleSheet, Text, View } from "react-native";
import { TutorVisualVocabularyCard } from "./VisualVocabulary";
import { STARTER_PHRASES } from "../../content/initial-phrases";
import { VISUAL_VOCABULARY } from "../../content/visual-vocabulary";
const COPY = {
    fi: {
        label: "SEURAAVA ASKELEESI",
        review: "Kertaa tämä ilmaus",
        difficult: "Tämä ilmaus kaipaa vielä harjoitusta",
        visual: "Opettele uusi sana kuvan avulla",
        lesson: "Jatka uusilla arjen ilmauksilla",
        consolidate: "Pidä taitosi aktiivisina",
        reviewReason: "Aiemmin harjoiteltu ilmaus on valmis kerrattavaksi.",
        difficultReason: "Tämä ilmaus on ollut sinulle haastava. Kertaamme sen rauhassa.",
        visualReason: "Kuvallinen harjoitus vahvistaa sanan ja merkityksen yhteyttä.",
        lessonReason: "Kuvallinen sanasto on käyty läpi. Seuraavaksi laajennetaan ilmaisuvarastoa.",
        consolidateReason: "Olet käynyt läpi nykyisen aloitussisällön. Voit harjoitella uudelleen.",
        startReview: "Aloita kertaus",
        startVisual: "Aloita kuvaharjoitus",
        startLesson: "Aloita oppitunti",
        continue: "Harjoittele uudelleen",
    },
    es: {
        label: "TU SIGUIENTE PASO",
        review: "Repasa esta expresión",
        difficult: "Esta expresión necesita más práctica",
        visual: "Aprende una palabra nueva con una imagen",
        lesson: "Continúa con nuevas expresiones cotidianas",
        consolidate: "Mantén tus conocimientos activos",
        reviewReason: "Una expresión que estudiaste ya está lista para repasar.",
        difficultReason: "Esta expresión te ha resultado difícil. Vamos a practicarla con calma.",
        visualReason: "La práctica visual refuerza la relación entre la palabra y su significado.",
        lessonReason: "Has completado el vocabulario visual. Ahora ampliarás tus expresiones.",
        consolidateReason: "Has completado el contenido inicial disponible. Puedes seguir practicando.",
        startReview: "Empezar repaso",
        startVisual: "Empezar práctica visual",
        startLesson: "Empezar lección",
        continue: "Volver a practicar",
    },
    en: {
        label: "YOUR NEXT STEP",
        review: "Review this expression",
        difficult: "This expression needs more practice",
        visual: "Learn a new word with a picture",
        lesson: "Continue with new everyday expressions",
        consolidate: "Keep your skills active",
        reviewReason: "An expression you studied is ready for review.",
        difficultReason: "This expression has been challenging. Let's practise it calmly.",
        visualReason: "Picture-based practice strengthens the link between a word and its meaning.",
        lessonReason: "You have completed the visual vocabulary. Next, expand your expressions.",
        consolidateReason: "You have completed the current starter content. You can keep practising.",
        startReview: "Start review",
        startVisual: "Start picture practice",
        startLesson: "Start lesson",
        continue: "Practise again",
    },
};
export function LearningPathSuggestion({ activity, interfaceLanguage, learningLanguage, explanationLanguage, onStartReview, onStartVisual, onStartLesson, }) {
    const language = interfaceLanguage === "es" || interfaceLanguage === "en" ? interfaceLanguage : "fi";
    const copy = COPY[language];
    const learningContentLanguage = learningLanguage === "fi" || learningLanguage === "es" || learningLanguage === "en" ? learningLanguage : "fi";
    const explanationContentLanguage = explanationLanguage === "fi" || explanationLanguage === "es" || explanationLanguage === "en" ? explanationLanguage : "fi";
    const phrase = activity.kind === "review"
        ? STARTER_PHRASES.find((item) => item.id === activity.phraseId)
        : undefined;
    const visual = activity.kind === "visual"
        ? VISUAL_VOCABULARY.find((item) => item.id === activity.entryId)
        : undefined;
    const title = activity.kind === "review"
        ? activity.reason === "difficult" ? copy.difficult : copy.review
        : activity.kind === "visual" ? copy.visual
            : activity.kind === "lesson" ? copy.lesson : copy.consolidate;
    const reason = activity.kind === "review"
        ? activity.reason === "difficult" ? copy.difficultReason : copy.reviewReason
        : activity.kind === "visual" ? copy.visualReason
            : activity.kind === "lesson" ? copy.lessonReason : copy.consolidateReason;
    const action = activity.kind === "review" ? onStartReview
        : activity.kind === "visual" ? onStartVisual
            : activity.kind === "lesson" ? onStartLesson : onStartVisual;
    const button = activity.kind === "review" ? copy.startReview
        : activity.kind === "visual" ? copy.startVisual
            : activity.kind === "lesson" ? copy.startLesson : copy.continue;
    return (<View style={styles.card}>
      <Text style={styles.label}>{copy.label}</Text>
      {visual && (<TutorVisualVocabularyCard entryId={visual.id} learningLanguage={learningLanguage} explanationLanguage={explanationLanguage}/>)}
      {phrase && (<View style={styles.phrase}>
          <Text style={styles.phraseText}>{phrase.translations[learningContentLanguage]}</Text>
          <Text style={styles.phraseMeaning}>{phrase.explanations[explanationContentLanguage]}</Text>
        </View>)}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.reason}>{reason}</Text>
      <Pressable accessibilityRole="button" onPress={action} style={styles.button}>
        <Text style={styles.buttonText}>{button}</Text>
      </Pressable>
    </View>);
}
const styles = StyleSheet.create({
    card: { gap: 10, padding: 16, borderRadius: 16, backgroundColor: "var(--elovio-source-3)", borderWidth: 1, borderColor: "var(--elovio-source-14)" },
    label: { color: "var(--elovio-source-2)", fontSize: 10, fontWeight: "700", letterSpacing: 1.5 },
    phrase: { padding: 14, borderRadius: 12, backgroundColor: "var(--elovio-source-42)", gap: 5 },
    phraseText: { color: "var(--elovio-source-6)", fontSize: 23, fontWeight: "700" },
    phraseMeaning: { color: "var(--elovio-source-7)", fontSize: 13, lineHeight: 19 },
    title: { color: "var(--elovio-source-6)", fontSize: 18, fontWeight: "700" },
    reason: { color: "var(--elovio-source-7)", fontSize: 13, lineHeight: 20 },
    button: { minHeight: 46, borderRadius: 11, paddingHorizontal: 14, alignItems: "center", justifyContent: "center", backgroundColor: "var(--elovio-source-15)" },
    buttonText: { color: "var(--elovio-source-3)", fontSize: 14, fontWeight: "700" },
});
