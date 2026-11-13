import { useMemo, useState } from "react";
import { Image, Linking, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View, } from "react-native";
import { resolveContentLanguage } from "../../services/content-language";
import { isStudyAnswerCorrect } from "../../services/answer-normalization";
import { VisualSequenceExercise } from "./VisualSequenceExercise";
import { BusTravelSequenceExercise } from "./BusTravelSequenceExercise";
import { CafeOrderSequenceExercise } from "./CafeOrderSequenceExercise";
import { CafeDialogueExercise } from "./CafeDialogueExercise";
import { HotelCheckinSequenceExercise } from "./HotelCheckinSequenceExercise";
import { GroceryShoppingSequenceExercise } from "./GroceryShoppingSequenceExercise";
import { AskingDirectionsSequenceExercise } from "./AskingDirectionsSequenceExercise";
import { DoctorEmergencyExercise } from "./DoctorEmergencyExercise";
import { DailyConversationExercise } from "./DailyConversationExercise";
import { getVisualVocabularyOptions, VISUAL_VOCABULARY } from "../../content/visual-vocabulary";
import { loadVisualVocabularyProgress, markVisualVocabularyMastered, saveVisualVocabularyProgress, } from "../../services/local-visual-vocabulary-progress";
const COPY = {
    fi: {
        eyebrow: "ELOVIO · VISUAALINEN SANASTO",
        title: "Opettele näkemällä",
        intro: "Katso kuvaa, valitse oikea sana tai kirjoita se opiskeltavalla kielellä.",
        prompt: "Mikä tämä on?",
        chooseAnswer: "Tai valitse oikea sana kuvasta:",
        placeholder: "Kirjoita sana…",
        check: "Tarkista vastaus",
        correct: "Oikein! Sana jäi mieleen.",
        incorrect: "Ei vielä. Yritä uudelleen tai katso oikea vastaus.",
        reveal: "Näytä oikea vastaus",
        next: "Seuraava sana",
        finish: "Sanasto harjoiteltu",
        finishBody: "Kävit läpi tämän aloitussanaston kaikki kuvat.",
        restart: "Harjoittele uudelleen",
        close: "Takaisin",
        translation: "Merkitys",
        source: "Kuvan tiedot",
        photo: "Valokuva",
        illustration: "Piirros",
        progress: "Sana",
        nativeLabel: "Selitys",
        mastered: "Opitut sanat",
        vocabularyMode: "Sanasto",
        directionsMode: "Tien kysyminen",
        doctorMode: "Lääkäri & apteekki",
        dailyMode: "Arkikeskustelut",
        sequenceMode: "Järjestys",
        busMode: "Bussimatka",
        cafeMode: "Kahvila",
        dialogueMode: "Vuoropuhelu",
        hotelMode: "Hotelli",
        groceryMode: "Ruokaostokset",
        photoFallback: "Valokuva ei ole saatavilla. Näytetään oma piirros.",
    },
    es: {
        eyebrow: "ELOVIO · VOCABULARIO VISUAL",
        title: "Aprende mirando",
        intro: "Mira la imagen y elige la palabra correcta o escríbela en el idioma que estudias.",
        prompt: "¿Qué es esto?",
        chooseAnswer: "O elige la palabra correcta:",
        placeholder: "Escribe la palabra…",
        check: "Comprobar",
        correct: "¡Correcto! Has recordado la palabra.",
        incorrect: "Todavía no. Inténtalo otra vez o revela la respuesta.",
        reveal: "Mostrar la respuesta",
        next: "Siguiente palabra",
        finish: "Vocabulario completado",
        finishBody: "Has repasado todas las imágenes de este vocabulario inicial.",
        restart: "Practicar otra vez",
        close: "Volver",
        translation: "Significado",
        source: "Datos de la imagen",
        photo: "Fotografía",
        illustration: "Ilustración",
        progress: "Palabra",
        nativeLabel: "Explicación",
        mastered: "Palabras aprendidas",
        vocabularyMode: "Vocabulario",
        directionsMode: "Indicaciones",
        doctorMode: "Médico y salud",
        dailyMode: "Conversación",
        sequenceMode: "Orden",
        busMode: "Autobús",
        cafeMode: "Cafetería",
        dialogueMode: "Diálogo",
        hotelMode: "Hotel",
        groceryMode: "Compra",
        photoFallback: "La fotografía no está disponible. Se muestra una ilustración original.",
    },
    en: {
        eyebrow: "ELOVIO · VISUAL VOCABULARY",
        title: "Learn by seeing",
        intro: "Look at the picture and choose the matching word or type it in your learning language.",
        prompt: "What is this?",
        chooseAnswer: "Or choose the matching word:",
        placeholder: "Type the word…",
        check: "Check answer",
        correct: "Correct! You remembered the word.",
        incorrect: "Not quite. Try again or reveal the answer.",
        reveal: "Reveal answer",
        next: "Next word",
        finish: "Vocabulary complete",
        finishBody: "You have reviewed every image in this starter set.",
        restart: "Practise again",
        close: "Back",
        translation: "Meaning",
        source: "Image details",
        photo: "Photograph",
        illustration: "Illustration",
        progress: "Word",
        nativeLabel: "Explanation",
        mastered: "Words mastered",
        vocabularyMode: "Vocabulary",
        directionsMode: "Directions",
        doctorMode: "Doctor & Clinic",
        dailyMode: "Conversation",
        sequenceMode: "Order",
        busMode: "Bus trip",
        cafeMode: "Café",
        dialogueMode: "Conversation",
        hotelMode: "Hotel",
        groceryMode: "Groceries",
        photoFallback: "The photo is unavailable. Showing an original illustration instead.",
    },
};
function HouseIllustration({ label }) {
    return (<View accessible accessibilityLabel={label} style={styles.illustrationCanvas}>
      <View style={styles.sun}/>
      <View style={styles.cloud}>
        <View style={styles.cloudLeft}/>
        <View style={styles.cloudRight}/>
      </View>
      <View style={styles.houseRoof}>
        <View style={styles.roofTriangle}/>
      </View>
      <View style={styles.houseBody}>
        <View style={styles.houseWindow}>
          <View style={styles.windowCrossVertical}/>
          <View style={styles.windowCrossHorizontal}/>
        </View>
        <View style={styles.houseDoor}/>
        <View style={styles.houseWindowRight}>
          <View style={styles.windowCrossVertical}/>
          <View style={styles.windowCrossHorizontal}/>
        </View>
      </View>
      <View style={styles.ground}/>
      <View style={styles.flowerStem}/>
      <View style={styles.flowerHead}/>
    </View>);
}
function CoffeeIllustration({ label }) {
    return (<View accessible accessibilityLabel={label} style={styles.illustrationCanvas}>
      <View style={styles.coffeeSteamOne}/>
      <View style={styles.coffeeSteamTwo}/>
      <View style={styles.coffeeCupHandle}/>
      <View style={styles.coffeeCup}>
        <View style={styles.coffeeSurface}/>
      </View>
      <View style={styles.coffeeSaucer}/>
    </View>);
}
function BusIllustration({ label }) {
    return (<View accessible accessibilityLabel={label} style={styles.illustrationCanvas}>
      <View style={styles.busBody}>
        <View style={styles.busWindshield}/>
        <View style={styles.busWindow}/>
        <View style={styles.busWindow}/>
        <View style={styles.busDoor}/>
        <View style={styles.busFrontLight}/>
      </View>
      <View style={styles.busWheelLeft}/>
      <View style={styles.busWheelRight}/>
      <View style={styles.busRoad}/>
    </View>);
}
function BookIllustration({ label }) {
    return (<View accessible accessibilityLabel={label} style={styles.illustrationCanvas}>
      <View style={styles.bookCover}>
        <View style={styles.bookPageLeft}>
          <View style={styles.bookLine}/>
          <View style={styles.bookLine}/>
          <View style={styles.bookLineShort}/>
        </View>
        <View style={styles.bookPageRight}>
          <View style={styles.bookLine}/>
          <View style={styles.bookLine}/>
          <View style={styles.bookLineShort}/>
        </View>
        <View style={styles.bookSpine}/>
      </View>
    </View>);
}
function AppleIllustration({ label }) {
    return <View accessible accessibilityLabel={label} style={styles.illustrationCanvas}>
    <View style={styles.appleBody}/><View style={styles.appleStem}/><View style={styles.appleLeaf}/>
  </View>;
}
function DogIllustration({ label }) {
    return <View accessible accessibilityLabel={label} style={styles.illustrationCanvas}>
    <View style={styles.dogEarLeft}/><View style={styles.dogEarRight}/>
    <View style={styles.dogHead}>
      <View style={styles.dogEyeLeft}/><View style={styles.dogEyeRight}/>
      <View style={styles.dogMuzzle}/><View style={styles.dogNose}/>
    </View>
    <View style={styles.dogBody}/><View style={styles.dogLegLeft}/><View style={styles.dogLegRight}/><View style={styles.dogTail}/>
  </View>;
}
function PhotoWithFallback({ uri, kind, label, unavailableText }) {
    const [failed, setFailed] = useState(false);
    if (failed)
        return <View style={styles.photoFallback}>
    {kind === "apple" ? <AppleIllustration label={label}/> : <DogIllustration label={label}/>}
    <Text style={styles.fallbackNotice}>{unavailableText}</Text>
  </View>;
    return <Image accessibilityLabel={label} onError={() => setFailed(true)} resizeMode="cover" source={{ uri }} style={styles.image}/>;
}
export function VocabularyIllustration({ kind, label }) {
    if (kind === "coffee")
        return <CoffeeIllustration label={label}/>;
    if (kind === "bus")
        return <BusIllustration label={label}/>;
    if (kind === "book")
        return <BookIllustration label={label}/>;
    return <HouseIllustration label={label}/>;
}

export function VisualVocabulary({ interfaceLanguage, nativeLanguage, learningLanguage, onClose, }) {
    const t = interfaceLanguage === "fi" ? COPY.fi : interfaceLanguage === "es" ? COPY.es : COPY.en;
    const contentLanguage = resolveContentLanguage(learningLanguage);
    const explanationContentLanguage = resolveContentLanguage(nativeLanguage, contentLanguage);
    const [index, setIndex] = useState(0);
    const [answer, setAnswer] = useState("");
    const [feedback, setFeedback] = useState(null);
    const [revealed, setRevealed] = useState(false);
    const [completed, setCompleted] = useState(false);
    const [mode, setMode] = useState("vocabulary");
    const [visualProgress, setVisualProgress] = useState(() => loadVisualVocabularyProgress());
    const entry = VISUAL_VOCABULARY[index];
    const answerOptions = useMemo(() => (entry ? getVisualVocabularyOptions(entry.id, contentLanguage) : []), [entry?.id, contentLanguage]);
    function submitAnswer(value) {
        if (!entry || !value.trim() || feedback === "correct" || revealed)
            return;
        const isCorrect = isStudyAnswerCorrect(value, entry.words[contentLanguage]);
        setAnswer(value);
        setFeedback(isCorrect ? "correct" : "incorrect");
        if (isCorrect) {
            const next = markVisualVocabularyMastered(visualProgress, entry.id);
            saveVisualVocabularyProgress(next);
            setVisualProgress(next);
        }
    }
    function checkAnswer() {
        submitAnswer(answer);
    }
    function nextWord() {
        if (index + 1 >= VISUAL_VOCABULARY.length) {
            setCompleted(true);
            return;
        }
        setIndex((current) => current + 1);
        setAnswer("");
        setFeedback(null);
        setRevealed(false);
    }
    function restart() {
        setIndex(0);
        setAnswer("");
        setFeedback(null);
        setRevealed(false);
        setCompleted(false);
    }
    return (<SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content"/>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.topRow}>
          <Text style={styles.eyebrow}>{t.eyebrow}</Text>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>{t.close}</Text>
          </Pressable>
        </View>

        <View style={styles.modeSwitch}>
          <Pressable accessibilityRole="button" accessibilityState={{ selected: mode === "vocabulary" }} onPress={() => setMode("vocabulary")} style={[styles.modeButton, mode === "vocabulary" && styles.modeButtonActive]}>
            <Text style={[styles.modeButtonText, mode === "vocabulary" && styles.modeButtonTextActive]}>{t.vocabularyMode}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityState={{ selected: mode === "directions" }} onPress={() => setMode("directions")} style={[styles.modeButton, mode === "directions" && styles.modeButtonActive]}>
            <Text style={[styles.modeButtonText, mode === "directions" && styles.modeButtonTextActive]}>{t.directionsMode}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityState={{ selected: mode === "doctor" }} onPress={() => setMode("doctor")} style={[styles.modeButton, mode === "doctor" && styles.modeButtonActive]}>
            <Text style={[styles.modeButtonText, mode === "doctor" && styles.modeButtonTextActive]}>{t.doctorMode}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityState={{ selected: mode === "daily" }} onPress={() => setMode("daily")} style={[styles.modeButton, mode === "daily" && styles.modeButtonActive]}>
            <Text style={[styles.modeButtonText, mode === "daily" && styles.modeButtonTextActive]}>{t.dailyMode}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityState={{ selected: mode === "sequence" }} onPress={() => setMode("sequence")} style={[styles.modeButton, mode === "sequence" && styles.modeButtonActive]}>
            <Text style={[styles.modeButtonText, mode === "sequence" && styles.modeButtonTextActive]}>{t.sequenceMode}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityState={{ selected: mode === "bus" }} onPress={() => setMode("bus")} style={[styles.modeButton, mode === "bus" && styles.modeButtonActive]}>
            <Text style={[styles.modeButtonText, mode === "bus" && styles.modeButtonTextActive]}>{t.busMode}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityState={{ selected: mode === "cafe" }} onPress={() => setMode("cafe")} style={[styles.modeButton, mode === "cafe" && styles.modeButtonActive]}>
            <Text style={[styles.modeButtonText, mode === "cafe" && styles.modeButtonTextActive]}>{t.cafeMode}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityState={{ selected: mode === "dialogue" }} onPress={() => setMode("dialogue")} style={[styles.modeButton, mode === "dialogue" && styles.modeButtonActive]}>
            <Text style={[styles.modeButtonText, mode === "dialogue" && styles.modeButtonTextActive]}>{t.dialogueMode}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityState={{ selected: mode === "hotel" }} onPress={() => setMode("hotel")} style={[styles.modeButton, mode === "hotel" && styles.modeButtonActive]}>
            <Text style={[styles.modeButtonText, mode === "hotel" && styles.modeButtonTextActive]}>{t.hotelMode}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityState={{ selected: mode === "grocery" }} onPress={() => setMode("grocery")} style={[styles.modeButton, mode === "grocery" && styles.modeButtonActive]}>
            <Text style={[styles.modeButtonText, mode === "grocery" && styles.modeButtonTextActive]}>{t.groceryMode}</Text>
          </Pressable>
        </View>

        {mode === "grocery" ? (<GroceryShoppingSequenceExercise interfaceLanguage={interfaceLanguage} learningLanguage={learningLanguage}/>) : mode === "hotel" ? (<HotelCheckinSequenceExercise interfaceLanguage={interfaceLanguage} learningLanguage={learningLanguage}/>) : mode === "dialogue" ? (<CafeDialogueExercise interfaceLanguage={interfaceLanguage} learningLanguage={learningLanguage}/>) : mode === "cafe" ? (<CafeOrderSequenceExercise interfaceLanguage={interfaceLanguage} learningLanguage={learningLanguage}/>) : mode === "bus" ? (<BusTravelSequenceExercise interfaceLanguage={interfaceLanguage} learningLanguage={learningLanguage}/>) : mode === "sequence" ? (<VisualSequenceExercise interfaceLanguage={interfaceLanguage} learningLanguage={learningLanguage}/>) : mode === "directions" ? (<AskingDirectionsSequenceExercise interfaceLanguage={interfaceLanguage} learningLanguage={learningLanguage}/>) : mode === "doctor" ? (<DoctorEmergencyExercise interfaceLanguage={interfaceLanguage} learningLanguage={learningLanguage}/>) : mode === "daily" ? (<DailyConversationExercise interfaceLanguage={interfaceLanguage} learningLanguage={learningLanguage}/>) : completed ? (<View style={styles.card}>
            <Text style={styles.heading}>{t.finish}</Text>
            <Text style={styles.body}>{t.finishBody}</Text>
            <Pressable accessibilityRole="button" onPress={restart} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>{t.restart}</Text>
            </Pressable>
          </View>) : entry ? (<>
            <Text style={styles.heading}>{t.title}</Text>
            <Text style={styles.body}>{t.intro}</Text>
            <Text style={styles.progress}>{t.progress} {index + 1} / {VISUAL_VOCABULARY.length}</Text>
            <Text style={styles.masteredProgress}>{t.mastered}: {visualProgress.masteredEntryIds.length} / {VISUAL_VOCABULARY.length}</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${((index + 1) / VISUAL_VOCABULARY.length) * 100}%` }]}/>
            </View>

            <View style={styles.card}>
              <View style={styles.mediaHeading}>
                <Text style={styles.mediaType}>
                  {entry.mediaType === "photograph" ? t.photo : t.illustration}
                </Text>
              </View>
              {entry.mediaType === "illustration" ? (<VocabularyIllustration kind={entry.illustrationKind ?? "house"} label={entry.imageDescription[contentLanguage]}/>) : entry.image ? (<PhotoWithFallback key={entry.id} uri={entry.image} kind={entry.id} label={entry.imageDescription[contentLanguage]} unavailableText={t.photoFallback}/>) : null}
              <Text style={styles.prompt}>{t.prompt}</Text>
              <Text style={styles.choicePrompt}>{t.chooseAnswer}</Text>
              <View style={styles.answerChoices}>
                {answerOptions.map((option) => (<Pressable key={option.id} accessibilityRole="button" accessibilityState={{ selected: answer === option.word }} disabled={feedback === "correct" || revealed} onPress={() => submitAnswer(option.word)} style={[styles.answerChoice, answer === option.word && styles.answerChoiceSelected]}>
                    <Text style={styles.answerChoiceText}>{option.word}</Text>
                  </Pressable>))}
              </View>
              <TextInput accessibilityLabel={t.prompt} autoCapitalize="none" autoCorrect={false} onChangeText={(value) => {
                setAnswer(value);
                setFeedback(null);
            }} onSubmitEditing={checkAnswer} placeholder={t.placeholder} returnKeyType="done" style={styles.input} value={answer}/>
              <Pressable accessibilityRole="button" disabled={!answer.trim()} onPress={checkAnswer} style={[styles.primaryButton, !answer.trim() && styles.disabledButton]}>
                <Text style={styles.primaryButtonText}>{t.check}</Text>
              </Pressable>

              {feedback === "correct" && <Text accessibilityRole="text" style={styles.correct}>{t.correct}</Text>}
              {feedback === "incorrect" && <Text accessibilityRole="text" style={styles.incorrect}>{t.incorrect}</Text>}

              {(revealed || feedback === "correct") && (<View style={styles.meaning}>
                  <Text style={styles.meaningLabel}>{t.translation}</Text>
                  <Text style={styles.word}>{entry.words[contentLanguage]}</Text>
                  <Text style={styles.body}>{entry.words[explanationContentLanguage]}</Text>
                </View>)}

              {feedback !== "correct" && !revealed && (<Pressable accessibilityRole="button" onPress={() => setRevealed(true)} style={styles.revealButton}>
                  <Text style={styles.revealText}>{t.reveal}</Text>
                </Pressable>)}
              {(feedback === "correct" || revealed) && (<Pressable accessibilityRole="button" onPress={nextWord} style={styles.primaryButton}>
                  <Text style={styles.primaryButtonText}>{t.next}</Text>
                </Pressable>)}
            </View>

            <View style={styles.attribution}>
              <Text style={styles.attributionTitle}>{t.source}</Text>
              <Text style={styles.attributionText}>{entry.source}</Text>
              <Text style={styles.attributionText}>{entry.author} · {entry.license}</Text>
              {entry.sourceUrl ? (<Pressable accessibilityRole="link" onPress={() => void Linking.openURL(entry.sourceUrl)}>
                  <Text style={styles.sourceLink}>Wikimedia Commons · {entry.license}</Text>
                </Pressable>) : null}
            </View>
          </>) : null}
      </ScrollView>
    </SafeAreaView>);
}
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: "var(--elovio-source-4)" },
    tutorVisualCard: { alignSelf: "flex-start", width: "100%", maxWidth: 280, padding: 10, borderRadius: 14, borderWidth: 1, borderColor: "var(--elovio-source-8)", backgroundColor: "var(--elovio-source-3)", alignItems: "center", gap: 5 },
    tutorVisualWord: { color: "var(--elovio-source-6)", fontSize: 20, fontWeight: "700" },
    tutorVisualMeaning: { color: "var(--elovio-source-7)", fontSize: 12, textAlign: "center" },
    content: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 48, gap: 18 },
    topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    eyebrow: { color: "var(--elovio-source-5)", fontSize: 10, fontWeight: "700", letterSpacing: 1.5, flexShrink: 1 },
    closeButton: { paddingVertical: 8, paddingHorizontal: 12 },
    closeText: { color: "var(--elovio-source-1)", fontWeight: "700" },
    heading: { color: "var(--elovio-source-6)", fontSize: 30, fontWeight: "700", letterSpacing: -0.8 },
    body: { color: "var(--elovio-source-7)", fontSize: 15, lineHeight: 23 },
    progress: { color: "var(--elovio-source-1)", fontSize: 13, fontWeight: "700" },
    masteredProgress: { color: "var(--elovio-source-1)", fontSize: 12, fontWeight: "600", marginTop: 4 },
    modeSwitch: { flexDirection: "row", flexWrap: "wrap", gap: 8, backgroundColor: "var(--elovio-source-100)", padding: 4, borderRadius: 12 },
    modeButton: { flexGrow: 1, flexBasis: "45%", paddingVertical: 11, borderRadius: 9, alignItems: "center" },
    modeButtonActive: { backgroundColor: "var(--elovio-source-3)" },
    modeButtonText: { color: "var(--elovio-source-7)", fontSize: 13, fontWeight: "600" },
    modeButtonTextActive: { color: "var(--elovio-source-27)", fontWeight: "700" },
    recallRow: { flexDirection: "column", gap: 10 },
    recallTile: { width: "100%", minWidth: 0, minHeight: 220, borderWidth: 1, borderColor: "var(--elovio-source-21)", borderRadius: 11, backgroundColor: "var(--elovio-source-22)", overflow: "hidden", alignItems: "center", justifyContent: "center", padding: 4 },
    recallNumber: { color: "var(--elovio-source-27)", fontSize: 12, fontWeight: "700", marginTop: 4 },
    progressTrack: { height: 7, backgroundColor: "var(--elovio-source-19)", borderRadius: 8, overflow: "hidden" },
    progressFill: { height: "100%", backgroundColor: "var(--elovio-source-20)", borderRadius: 8 },
    card: { backgroundColor: "var(--elovio-source-3)", borderRadius: 22, padding: 18, gap: 14, borderWidth: 1, borderColor: "var(--elovio-source-18)" },
    image: { width: "100%", height: 220, borderRadius: 14, backgroundColor: "var(--elovio-source-101)" },
    mediaHeading: { alignItems: "flex-start" },
    mediaType: { color: "var(--elovio-source-5)", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 },
    photoFallback: { gap: 8, alignItems: "center" },
    fallbackNotice: { color: "var(--elovio-source-45)", fontSize: 11, lineHeight: 16, textAlign: "center" },
    appleBody: { position: "absolute", top: 48, width: 94, height: 78, borderRadius: 38, backgroundColor: "var(--elovio-source-71)", borderWidth: 3, borderColor: "var(--elovio-source-102)" },
    appleStem: { position: "absolute", top: 31, width: 8, height: 25, borderRadius: 4, backgroundColor: "var(--elovio-source-103)", transform: [{ rotate: "12deg" }] },
    appleLeaf: { position: "absolute", top: 31, left: "53%", width: 26, height: 13, borderRadius: 14, backgroundColor: "var(--elovio-source-104)", transform: [{ rotate: "-25deg" }] },
    dogHead: { position: "absolute", top: 30, width: 76, height: 68, borderRadius: 34, backgroundColor: "var(--elovio-source-105)", alignItems: "center" },
    dogEarLeft: { position: "absolute", top: 34, left: "28%", width: 25, height: 47, borderRadius: 15, backgroundColor: "var(--elovio-source-106)", transform: [{ rotate: "-18deg" }] },
    dogEarRight: { position: "absolute", top: 34, right: "28%", width: 25, height: 47, borderRadius: 15, backgroundColor: "var(--elovio-source-106)", transform: [{ rotate: "18deg" }] },
    dogEyeLeft: { position: "absolute", top: 24, left: 20, width: 6, height: 7, borderRadius: 4, backgroundColor: "var(--elovio-source-107)" },
    dogEyeRight: { position: "absolute", top: 24, right: 20, width: 6, height: 7, borderRadius: 4, backgroundColor: "var(--elovio-source-107)" },
    dogMuzzle: { position: "absolute", top: 37, width: 38, height: 24, borderRadius: 15, backgroundColor: "var(--elovio-source-108)" },
    dogNose: { position: "absolute", top: 39, width: 11, height: 8, borderRadius: 6, backgroundColor: "var(--elovio-source-109)" },
    dogBody: { position: "absolute", bottom: 18, width: 82, height: 39, borderRadius: 22, backgroundColor: "var(--elovio-source-105)" },
    dogLegLeft: { position: "absolute", bottom: 7, left: "37%", width: 13, height: 25, borderRadius: 7, backgroundColor: "var(--elovio-source-106)" },
    dogLegRight: { position: "absolute", bottom: 7, right: "37%", width: 13, height: 25, borderRadius: 7, backgroundColor: "var(--elovio-source-106)" },
    dogTail: { position: "absolute", bottom: 43, right: "24%", width: 33, height: 10, borderRadius: 7, backgroundColor: "var(--elovio-source-106)", transform: [{ rotate: "-28deg" }] },
    illustrationCanvas: { width: "100%", height: 220, borderRadius: 14, backgroundColor: "var(--elovio-source-23)", overflow: "hidden", alignItems: "center", justifyContent: "flex-end" },
    sun: { position: "absolute", top: 24, right: 34, width: 42, height: 42, borderRadius: 21, backgroundColor: "var(--elovio-source-24)" },
    cloud: { position: "absolute", top: 45, left: 42, width: 75, height: 22, borderRadius: 14, backgroundColor: "var(--elovio-source-3)" },
    cloudLeft: { position: "absolute", left: 12, top: -10, width: 28, height: 28, borderRadius: 14, backgroundColor: "var(--elovio-source-3)" },
    cloudRight: { position: "absolute", right: 10, top: -8, width: 25, height: 25, borderRadius: 13, backgroundColor: "var(--elovio-source-3)" },
    houseRoof: { width: 0, height: 0, borderLeftWidth: 76, borderRightWidth: 76, borderBottomWidth: 76, borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomColor: "var(--elovio-source-29)", marginBottom: -2, zIndex: 2 },
    roofTriangle: { position: "absolute", top: 14, left: -61, width: 0, height: 0, borderLeftWidth: 61, borderRightWidth: 61, borderBottomWidth: 61, borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomColor: "var(--elovio-source-110)" },
    houseBody: { width: 124, height: 91, backgroundColor: "var(--elovio-source-111)", flexDirection: "row", alignItems: "flex-start", justifyContent: "space-around", paddingTop: 15, borderWidth: 2, borderColor: "var(--elovio-source-112)" },
    houseWindow: { width: 22, height: 22, backgroundColor: "var(--elovio-source-37)", borderWidth: 2, borderColor: "var(--elovio-source-3)" },
    houseWindowRight: { width: 22, height: 22, backgroundColor: "var(--elovio-source-37)", borderWidth: 2, borderColor: "var(--elovio-source-3)" },
    windowCrossVertical: { position: "absolute", left: 8, top: 0, width: 2, height: 18, backgroundColor: "var(--elovio-source-3)" },
    windowCrossHorizontal: { position: "absolute", left: 0, top: 8, width: 18, height: 2, backgroundColor: "var(--elovio-source-3)" },
    houseDoor: { width: 26, height: 58, backgroundColor: "var(--elovio-source-97)", alignSelf: "flex-end", borderTopLeftRadius: 8, borderTopRightRadius: 8 },
    ground: { width: "100%", height: 24, backgroundColor: "var(--elovio-source-25)" },
    flowerStem: { position: "absolute", bottom: 21, left: 38, width: 3, height: 34, backgroundColor: "var(--elovio-source-113)", transform: [{ rotate: "8deg" }] },
    flowerHead: { position: "absolute", bottom: 51, left: 30, width: 18, height: 18, borderRadius: 9, backgroundColor: "var(--elovio-source-114)", borderWidth: 4, borderColor: "var(--elovio-source-115)" },
    coffeeSteamOne: { position: "absolute", top: 48, left: "46%", width: 3, height: 26, borderRadius: 3, backgroundColor: "var(--elovio-source-116)", transform: [{ rotate: "12deg" }] },
    coffeeSteamTwo: { position: "absolute", top: 38, left: "54%", width: 3, height: 30, borderRadius: 3, backgroundColor: "var(--elovio-source-116)", transform: [{ rotate: "-12deg" }] },
    coffeeCupHandle: { position: "absolute", top: 92, left: "58%", width: 42, height: 48, borderWidth: 9, borderColor: "var(--elovio-source-29)", borderLeftWidth: 0, borderTopRightRadius: 24, borderBottomRightRadius: 24 },
    coffeeCup: { position: "absolute", top: 88, left: "31%", width: 116, height: 78, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, backgroundColor: "var(--elovio-source-26)", borderWidth: 4, borderColor: "var(--elovio-source-29)", overflow: "hidden" },
    coffeeSurface: { width: "100%", height: 13, backgroundColor: "var(--elovio-source-97)", borderBottomLeftRadius: 50, borderBottomRightRadius: 50 },
    coffeeSaucer: { position: "absolute", top: 164, left: "27%", width: 142, height: 13, borderRadius: 10, backgroundColor: "var(--elovio-source-117)", borderWidth: 2, borderColor: "var(--elovio-source-118)" },
    busBody: { position: "absolute", top: 74, left: "12%", width: "76%", height: 88, borderRadius: 16, backgroundColor: "var(--elovio-source-35)", borderWidth: 3, borderColor: "var(--elovio-source-36)", flexDirection: "row", alignItems: "flex-start", padding: 10, gap: 6 },
    busWindshield: { width: "23%", height: 34, borderRadius: 5, backgroundColor: "var(--elovio-source-37)" },
    busWindow: { width: "19%", height: 34, borderRadius: 5, backgroundColor: "var(--elovio-source-37)" },
    busDoor: { width: "17%", height: 61, marginTop: 0, backgroundColor: "var(--elovio-source-38)", borderWidth: 2, borderColor: "var(--elovio-source-36)" },
    busFrontLight: { position: "absolute", right: 2, top: 52, width: 9, height: 12, borderRadius: 4, backgroundColor: "var(--elovio-source-39)" },
    busWheelLeft: { position: "absolute", top: 145, left: "23%", width: 32, height: 32, borderRadius: 16, backgroundColor: "var(--elovio-source-40)", borderWidth: 5, borderColor: "var(--elovio-source-41)" },
    busWheelRight: { position: "absolute", top: 145, right: "23%", width: 32, height: 32, borderRadius: 16, backgroundColor: "var(--elovio-source-40)", borderWidth: 5, borderColor: "var(--elovio-source-41)" },
    busRoad: { position: "absolute", bottom: 27, width: "100%", height: 5, backgroundColor: "var(--elovio-source-119)" },
    bookCover: { position: "absolute", top: 64, width: 190, height: 112, borderRadius: 12, backgroundColor: "var(--elovio-source-29)", padding: 9, flexDirection: "row", gap: 2, transform: [{ rotate: "-4deg" }] },
    bookPageLeft: { flex: 1, backgroundColor: "var(--elovio-source-26)", borderTopLeftRadius: 8, borderBottomLeftRadius: 8, padding: 12, gap: 10 },
    bookPageRight: { flex: 1, backgroundColor: "var(--elovio-source-26)", borderTopRightRadius: 8, borderBottomRightRadius: 8, padding: 12, gap: 10 },
    bookLine: { width: "100%", height: 3, borderRadius: 2, backgroundColor: "var(--elovio-source-120)" },
    bookLineShort: { width: "65%", height: 3, borderRadius: 2, backgroundColor: "var(--elovio-source-120)" },
    bookSpine: { position: "absolute", top: 9, bottom: 9, left: "50%", width: 3, backgroundColor: "var(--elovio-source-121)" },
    prompt: { color: "var(--elovio-source-6)", fontSize: 19, fontWeight: "700" },
    choicePrompt: { color: "var(--elovio-source-7)", fontSize: 13, fontWeight: "600" },
    answerChoices: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    answerChoice: { minWidth: "30%", flexGrow: 1, borderWidth: 1, borderColor: "var(--elovio-source-21)", borderRadius: 11, paddingVertical: 12, paddingHorizontal: 10, alignItems: "center", backgroundColor: "var(--elovio-source-3)" },
    answerChoiceSelected: { borderColor: "var(--elovio-source-1)", backgroundColor: "var(--elovio-source-10)" },
    answerChoiceText: { color: "var(--elovio-source-11)", fontSize: 14, fontWeight: "700" },
    input: { borderWidth: 1, borderColor: "var(--elovio-source-21)", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16, color: "var(--elovio-source-6)" },
    primaryButton: { backgroundColor: "var(--elovio-source-27)", borderRadius: 12, paddingVertical: 14, paddingHorizontal: 18, alignItems: "center" },
    primaryButtonText: { color: "var(--elovio-source-3)", fontSize: 15, fontWeight: "700" },
    disabledButton: { opacity: 0.45 },
    correct: { color: "var(--elovio-source-43)", fontSize: 15, fontWeight: "700" },
    incorrect: { color: "var(--elovio-source-44)", fontSize: 15, fontWeight: "700" },
    meaning: { padding: 14, borderRadius: 12, backgroundColor: "var(--elovio-source-42)", gap: 4 },
    meaningLabel: { color: "var(--elovio-source-5)", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 },
    word: { color: "var(--elovio-source-6)", fontSize: 25, fontWeight: "700" },
    revealButton: { alignItems: "center", paddingVertical: 10 },
    revealText: { color: "var(--elovio-source-1)", fontWeight: "700" },
    attribution: { gap: 4, paddingHorizontal: 2 },
    attributionTitle: { color: "var(--elovio-source-7)", fontSize: 12, fontWeight: "700" },
    attributionText: { color: "var(--elovio-source-45)", fontSize: 11, lineHeight: 16 },
    sourceLink: { color: "var(--elovio-source-1)", fontSize: 11, textDecorationLine: "underline", marginTop: 3 },
});
export function TutorVisualVocabularyCard({ entryId, learningLanguage, explanationLanguage, }) {
    const contentLanguage = resolveContentLanguage(learningLanguage);
    const explanationContentLanguage = resolveContentLanguage(explanationLanguage, contentLanguage);
    const entry = VISUAL_VOCABULARY.find((item) => item.id === entryId);
    if (!entry)
        return null;
    return (<View style={styles.tutorVisualCard}>
      {entry.mediaType === "illustration" ? (<VocabularyIllustration kind={entry.illustrationKind ?? "house"} label={entry.imageDescription[contentLanguage]}/>) : (<PhotoWithFallback uri={entry.image} kind={entry.offlineFallbackIllustration} label={entry.imageDescription[contentLanguage]} unavailableText={explanationLanguage === "es"
                ? "La foto no está disponible; se muestra una ilustración."
                : explanationLanguage === "en"
                    ? "The photo is unavailable; an illustration is shown."
                    : "Valokuva ei ole saatavilla; näytetään piirros."}/>)}
      <Text style={styles.tutorVisualWord}>{entry.words[contentLanguage]}</Text>
      <Text style={styles.tutorVisualMeaning}>
        {entry.words[explanationContentLanguage]} · {entry.imageDescription[explanationContentLanguage]}
      </Text>
      <Text style={styles.attributionText}>
        {entry.source} · {entry.author} · {entry.license}
      </Text>
    </View>);
}
