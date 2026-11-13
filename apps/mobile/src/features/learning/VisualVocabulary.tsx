import { useMemo, useState } from "react";
import {
  Image,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { LanguageCode } from "../../config/languages";
import { resolveContentLanguage } from "../../services/content-language";
import { isStudyAnswerCorrect } from "../../services/answer-normalization";
import { createVisualRecallRound } from "../../services/visual-recall";
import { VisualSequenceExercise } from "./VisualSequenceExercise";
import { BusTravelSequenceExercise } from "./BusTravelSequenceExercise";
import { CafeOrderSequenceExercise } from "./CafeOrderSequenceExercise";
import { CafeDialogueExercise } from "./CafeDialogueExercise";
import { HotelCheckinSequenceExercise } from "./HotelCheckinSequenceExercise";
import { GroceryShoppingSequenceExercise } from "./GroceryShoppingSequenceExercise";
import { AskingDirectionsSequenceExercise } from "./AskingDirectionsSequenceExercise";
import { getVisualVocabularyOptions, VISUAL_VOCABULARY } from "../../content/visual-vocabulary";
import {
  loadVisualVocabularyProgress,
  markVisualVocabularyMastered,
  saveVisualVocabularyProgress,
  type VisualVocabularyProgress,
} from "../../services/local-visual-vocabulary-progress";


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
    recallMode: "Muistipeli",
    sequenceMode: "Järjestys",
    busMode: "Bussimatka",
    cafeMode: "Kahvila",
    dialogueMode: "Vuoropuhelu",
    hotelMode: "Hotelli",
    groceryMode: "Ruokaostokset",
    directionsMode: "Tien kysyminen",
    recallIntro: "Katso kolmen kuvan järjestys ja yritä muistaa se.",
    previewSequence: "Muista kuvien järjestys",
    startRecall: "Olen valmis",
    photoFallback: "Valokuva ei ole saatavilla. Näytetään oma piirros.",
    question: "Mikä kuva oli",
    first: "ensimmäisenä",
    second: "toisena",
    third: "kolmantena",
    correctRecall: "Oikein! Muistit kuvan paikan.",
    incorrectRecall: "Ei aivan. Katso järjestys uudelleen ja kokeile seuraavaa kierrosta.",
    nextRound: "Seuraava kierros",
    showSequence: "Näytä kuvasarja",
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
    recallMode: "Memoria visual",
    sequenceMode: "Orden",
    busMode: "Autobús",
    cafeMode: "Cafetería",
    dialogueMode: "Diálogo",
    hotelMode: "Hotel",
    groceryMode: "Compra",
    directionsMode: "Cómo llegar",
    recallIntro: "Observa el orden de tres imágenes e intenta recordarlo.",
    previewSequence: "Recuerda el orden",
    startRecall: "Estoy listo",
    photoFallback: "La fotografía no está disponible. Se muestra una ilustración original.",
    question: "¿Qué imagen estaba",
    first: "primer lugar",
    second: "segundo lugar",
    third: "tercer lugar",
    correctRecall: "¡Correcto! Has recordado la posición.",
    incorrectRecall: "No exactamente. Vuelve a mirar la secuencia en la próxima ronda.",
    nextRound: "Siguiente ronda",
    showSequence: "Mostrar la secuencia",
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
    recallMode: "Picture memory",
    sequenceMode: "Order",
    busMode: "Bus trip",
    cafeMode: "Café",
    dialogueMode: "Conversation",
    hotelMode: "Hotel",
    groceryMode: "Groceries",
    directionsMode: "Directions",
    recallIntro: "Look at the order of three pictures and try to remember it.",
    previewSequence: "Remember the picture order",
    startRecall: "I'm ready",
    photoFallback: "The photo is unavailable. Showing an original illustration instead.",
    question: "Which picture was in the",
    first: "first",
    second: "second",
    third: "third",
    correctRecall: "Correct! You remembered the position.",
    incorrectRecall: "Not quite. Review the sequence in the next round.",
    nextRound: "Next round",
    showSequence: "Show the sequence again",
  },
} as const;

type VisualVocabularyCopy = (typeof COPY)[keyof typeof COPY];

function HouseIllustration({ label }: { label: string }) {
  return (
    <View accessible accessibilityLabel={label} style={styles.illustrationCanvas}>
      <View style={styles.sun} />
      <View style={styles.cloud}>
        <View style={styles.cloudLeft} />
        <View style={styles.cloudRight} />
      </View>
      <View style={styles.houseRoof}>
        <View style={styles.roofTriangle} />
      </View>
      <View style={styles.houseBody}>
        <View style={styles.houseWindow}>
          <View style={styles.windowCrossVertical} />
          <View style={styles.windowCrossHorizontal} />
        </View>
        <View style={styles.houseDoor} />
        <View style={styles.houseWindowRight}>
          <View style={styles.windowCrossVertical} />
          <View style={styles.windowCrossHorizontal} />
        </View>
      </View>
      <View style={styles.ground} />
      <View style={styles.flowerStem} />
      <View style={styles.flowerHead} />
    </View>
  );
}

function CoffeeIllustration({ label }: { label: string }) {
  return (
    <View accessible accessibilityLabel={label} style={styles.illustrationCanvas}>
      <View style={styles.coffeeSteamOne} />
      <View style={styles.coffeeSteamTwo} />
      <View style={styles.coffeeCupHandle} />
      <View style={styles.coffeeCup}>
        <View style={styles.coffeeSurface} />
      </View>
      <View style={styles.coffeeSaucer} />
    </View>
  );
}

function BusIllustration({ label }: { label: string }) {
  return (
    <View accessible accessibilityLabel={label} style={styles.illustrationCanvas}>
      <View style={styles.busBody}>
        <View style={styles.busWindshield} />
        <View style={styles.busWindow} />
        <View style={styles.busWindow} />
        <View style={styles.busDoor} />
        <View style={styles.busFrontLight} />
      </View>
      <View style={styles.busWheelLeft} />
      <View style={styles.busWheelRight} />
      <View style={styles.busRoad} />
    </View>
  );
}

function BookIllustration({ label }: { label: string }) {
  return (
    <View accessible accessibilityLabel={label} style={styles.illustrationCanvas}>
      <View style={styles.bookCover}>
        <View style={styles.bookPageLeft}>
          <View style={styles.bookLine} />
          <View style={styles.bookLine} />
          <View style={styles.bookLineShort} />
        </View>
        <View style={styles.bookPageRight}>
          <View style={styles.bookLine} />
          <View style={styles.bookLine} />
          <View style={styles.bookLineShort} />
        </View>
        <View style={styles.bookSpine} />
      </View>
    </View>
  );
}


function AppleIllustration({ label }: { label: string }) {
  return <View accessible accessibilityLabel={label} style={styles.illustrationCanvas}>
    <View style={styles.appleBody} /><View style={styles.appleStem} /><View style={styles.appleLeaf} />
  </View>;
}

function DogIllustration({ label }: { label: string }) {
  return <View accessible accessibilityLabel={label} style={styles.illustrationCanvas}>
    <View style={styles.dogEarLeft} /><View style={styles.dogEarRight} />
    <View style={styles.dogHead}>
      <View style={styles.dogEyeLeft} /><View style={styles.dogEyeRight} />
      <View style={styles.dogMuzzle} /><View style={styles.dogNose} />
    </View>
    <View style={styles.dogBody} /><View style={styles.dogLegLeft} /><View style={styles.dogLegRight} /><View style={styles.dogTail} />
  </View>;
}

function PhotoWithFallback({ uri, kind, label, unavailableText }: {
  uri: string; kind: "apple" | "dog"; label: string; unavailableText: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return <View style={styles.photoFallback}>
    {kind === "apple" ? <AppleIllustration label={label} /> : <DogIllustration label={label} />}
    <Text style={styles.fallbackNotice}>{unavailableText}</Text>
  </View>;
  return <Image accessibilityLabel={label} onError={() => setFailed(true)} resizeMode="cover" source={{ uri }} style={styles.image} />;
}

export function VocabularyIllustration({ kind, label }: { kind: "house" | "coffee" | "bus" | "book"; label: string }) {
  if (kind === "coffee") return <CoffeeIllustration label={label} />;
  if (kind === "bus") return <BusIllustration label={label} />;
  if (kind === "book") return <BookIllustration label={label} />;
  return <HouseIllustration label={label} />;
}


function VisualRecallExercise({ t, learningLanguage }: {
  t: VisualVocabularyCopy;
  learningLanguage: LanguageCode;
}) {
  const contentLanguage = resolveContentLanguage(learningLanguage);
  const [round, setRound] = useState(() => createVisualRecallRound());
  const [stage, setStage] = useState<"preview" | "question" | "feedback">("preview");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  if (!round) return null;
  const sequence = round.sequenceIds.map((id) => VISUAL_VOCABULARY.find((entry) => entry.id === id)).filter((entry) => Boolean(entry));
  const choices = round.choiceIds.map((id) => VISUAL_VOCABULARY.find((entry) => entry.id === id)).filter((entry) => Boolean(entry));
  const target = sequence[round.targetPosition];
  const position = round.targetPosition === 0 ? t.first : round.targetPosition === 1 ? t.second : t.third;
  const correct = selectedId === target?.id;

  function nextRound() {
    setRound(createVisualRecallRound());
    setSelectedId(null);
    setStage("preview");
  }

  function renderMedia(entry: (typeof VISUAL_VOCABULARY)[number]) {
    if (entry.mediaType === "illustration") {
      return <VocabularyIllustration kind={entry.illustrationKind ?? "house"} label={entry.imageDescription[contentLanguage]} />;
    }
    return <PhotoWithFallback key={entry.id} uri={entry.image!} kind={entry.offlineFallbackIllustration!} label={entry.imageDescription[contentLanguage]} unavailableText={t.photoFallback} />;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>{t.recallMode}</Text>
      <Text style={styles.body}>{t.recallIntro}</Text>
      {stage === "preview" ? (
        <>
          <Text style={styles.prompt}>{t.previewSequence}</Text>
          <View style={styles.recallRow}>
            {sequence.map((entry, index) => (
              <View key={entry!.id} style={styles.recallTile}>
                {renderMedia(entry!)}
                <Text style={styles.recallNumber}>{index + 1}</Text>
              </View>
            ))}
          </View>
          <Pressable accessibilityRole="button" onPress={() => setStage("question")} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{t.startRecall}</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={styles.prompt}>{t.question} {position}?</Text>
          <View style={styles.recallRow}>
            {choices.map((entry) => (
              <Pressable
                key={entry!.id}
                accessibilityRole="button"
                accessibilityLabel={entry!.imageDescription[contentLanguage]}
                accessibilityState={{ selected: selectedId === entry!.id }}
                disabled={stage === "feedback"}
                onPress={() => {
                  setSelectedId(entry!.id);
                  setStage("feedback");
                }}
                style={[styles.recallTile, selectedId === entry!.id && styles.answerChoiceSelected]}
              >
                {renderMedia(entry!)}
              </Pressable>
            ))}
          </View>
          {stage === "feedback" && (
            <>
              <Text accessibilityRole="text" style={correct ? styles.correct : styles.incorrect}>
                {correct ? t.correctRecall : t.incorrectRecall}
              </Text>
              <Pressable accessibilityRole="button" onPress={nextRound} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>{t.nextRound}</Text>
              </Pressable>
            </>
          )}
        </>
      )}
    </View>
  );
}

export function VisualVocabulary({
  interfaceLanguage,
  nativeLanguage,
  learningLanguage,
  onClose,
}: {
  interfaceLanguage: LanguageCode;
  nativeLanguage: LanguageCode;
  learningLanguage: LanguageCode;
  onClose: () => void;
}) {
  const t = interfaceLanguage === "fi" ? COPY.fi : interfaceLanguage === "es" ? COPY.es : COPY.en;
  const contentLanguage = resolveContentLanguage(learningLanguage);
  const explanationContentLanguage = resolveContentLanguage(nativeLanguage, contentLanguage);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [mode, setMode] = useState<"vocabulary" | "recall" | "sequence" | "bus" | "cafe" | "dialogue" | "hotel" | "grocery" | "directions">("vocabulary");
  const [visualProgress, setVisualProgress] = useState<VisualVocabularyProgress>(() => loadVisualVocabularyProgress());
  const entry = VISUAL_VOCABULARY[index];
  const answerOptions = useMemo(
    () => (entry ? getVisualVocabularyOptions(entry.id, contentLanguage) : []),
    [entry?.id, contentLanguage],
  );

  function submitAnswer(value: string) {
    if (!entry || !value.trim() || feedback === "correct" || revealed) return;
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
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
          <Pressable accessibilityRole="button" accessibilityState={{ selected: mode === "recall" }} onPress={() => setMode("recall")} style={[styles.modeButton, mode === "recall" && styles.modeButtonActive]}>
            <Text style={[styles.modeButtonText, mode === "recall" && styles.modeButtonTextActive]}>{t.recallMode}</Text>
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
          <Pressable accessibilityRole="button" accessibilityState={{ selected: mode === "directions" }} onPress={() => setMode("directions")} style={[styles.modeButton, mode === "directions" && styles.modeButtonActive]}>
            <Text style={[styles.modeButtonText, mode === "directions" && styles.modeButtonTextActive]}>{t.directionsMode}</Text>
          </Pressable>
        </View>

        {mode === "directions" ? (
          <AskingDirectionsSequenceExercise interfaceLanguage={interfaceLanguage} learningLanguage={learningLanguage} />
        ) : mode === "grocery" ? (
          <GroceryShoppingSequenceExercise interfaceLanguage={interfaceLanguage} learningLanguage={learningLanguage} />
        ) : mode === "hotel" ? (
          <HotelCheckinSequenceExercise interfaceLanguage={interfaceLanguage} learningLanguage={learningLanguage} />
        ) : mode === "dialogue" ? (
          <CafeDialogueExercise interfaceLanguage={interfaceLanguage} learningLanguage={learningLanguage} />
        ) : mode === "cafe" ? (
          <CafeOrderSequenceExercise interfaceLanguage={interfaceLanguage} learningLanguage={learningLanguage} />
        ) : mode === "bus" ? (
          <BusTravelSequenceExercise interfaceLanguage={interfaceLanguage} learningLanguage={learningLanguage} />
        ) : mode === "sequence" ? (
          <VisualSequenceExercise interfaceLanguage={interfaceLanguage} learningLanguage={learningLanguage} />
        ) : mode === "recall" ? (
          <VisualRecallExercise t={t} learningLanguage={learningLanguage} />
        ) : completed ? (
          <View style={styles.card}>
            <Text style={styles.heading}>{t.finish}</Text>
            <Text style={styles.body}>{t.finishBody}</Text>
            <Pressable accessibilityRole="button" onPress={restart} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>{t.restart}</Text>
            </Pressable>
          </View>
        ) : entry ? (
          <>
            <Text style={styles.heading}>{t.title}</Text>
            <Text style={styles.body}>{t.intro}</Text>
            <Text style={styles.progress}>{t.progress} {index + 1} / {VISUAL_VOCABULARY.length}</Text>
            <Text style={styles.masteredProgress}>{t.mastered}: {visualProgress.masteredEntryIds.length} / {VISUAL_VOCABULARY.length}</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${((index + 1) / VISUAL_VOCABULARY.length) * 100}%` }]} />
            </View>

            <View style={styles.card}>
              <View style={styles.mediaHeading}>
                <Text style={styles.mediaType}>
                  {entry.mediaType === "photograph" ? t.photo : t.illustration}
                </Text>
              </View>
              {entry.mediaType === "illustration" ? (
                <VocabularyIllustration kind={entry.illustrationKind ?? "house"} label={entry.imageDescription[contentLanguage]} />
              ) : entry.image ? (
                <PhotoWithFallback key={entry.id} uri={entry.image} kind={entry.id as "apple" | "dog"} label={entry.imageDescription[contentLanguage]} unavailableText={t.photoFallback} />
              ) : null}
              <Text style={styles.prompt}>{t.prompt}</Text>
              <Text style={styles.choicePrompt}>{t.chooseAnswer}</Text>
              <View style={styles.answerChoices}>
                {answerOptions.map((option) => (
                  <Pressable
                    key={option.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: answer === option.word }}
                    disabled={feedback === "correct" || revealed}
                    onPress={() => submitAnswer(option.word)}
                    style={[styles.answerChoice, answer === option.word && styles.answerChoiceSelected]}
                  >
                    <Text style={styles.answerChoiceText}>{option.word}</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                accessibilityLabel={t.prompt}
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={(value) => {
                  setAnswer(value);
                  setFeedback(null);
                }}
                onSubmitEditing={checkAnswer}
                placeholder={t.placeholder}
                returnKeyType="done"
                style={styles.input}
                value={answer}
              />
              <Pressable
                accessibilityRole="button"
                disabled={!answer.trim()}
                onPress={checkAnswer}
                style={[styles.primaryButton, !answer.trim() && styles.disabledButton]}
              >
                <Text style={styles.primaryButtonText}>{t.check}</Text>
              </Pressable>

              {feedback === "correct" && <Text accessibilityRole="text" style={styles.correct}>{t.correct}</Text>}
              {feedback === "incorrect" && <Text accessibilityRole="text" style={styles.incorrect}>{t.incorrect}</Text>}

              {(revealed || feedback === "correct") && (
                <View style={styles.meaning}>
                  <Text style={styles.meaningLabel}>{t.translation}</Text>
                  <Text style={styles.word}>{entry.words[contentLanguage]}</Text>
                  <Text style={styles.body}>{entry.words[explanationContentLanguage]}</Text>
                </View>
              )}

              {feedback !== "correct" && !revealed && (
                <Pressable accessibilityRole="button" onPress={() => setRevealed(true)} style={styles.revealButton}>
                  <Text style={styles.revealText}>{t.reveal}</Text>
                </Pressable>
              )}
              {(feedback === "correct" || revealed) && (
                <Pressable accessibilityRole="button" onPress={nextWord} style={styles.primaryButton}>
                  <Text style={styles.primaryButtonText}>{t.next}</Text>
                </Pressable>
              )}
            </View>

            <View style={styles.attribution}>
              <Text style={styles.attributionTitle}>{t.source}</Text>
              <Text style={styles.attributionText}>{entry.source}</Text>
              <Text style={styles.attributionText}>{entry.author} · {entry.license}</Text>
              {entry.sourceUrl ? (
                <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(entry.sourceUrl!)}>
                  <Text style={styles.sourceLink}>Wikimedia Commons · {entry.license}</Text>
                </Pressable>
              ) : null}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F7F6F1" },
  tutorVisualCard: { alignSelf: "flex-start", width: "100%", maxWidth: 280, padding: 10, borderRadius: 14, borderWidth: 1, borderColor: "#E7E9E2", backgroundColor: "#FFFFFF", alignItems: "center", gap: 5 },
  tutorVisualWord: { color: "#183D32", fontSize: 20, fontWeight: "700" },
  tutorVisualMeaning: { color: "#52645B", fontSize: 12, textAlign: "center" },
  content: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 48, gap: 18 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  eyebrow: { color: "#64736B", fontSize: 10, fontWeight: "700", letterSpacing: 1.5, flexShrink: 1 },
  closeButton: { paddingVertical: 8, paddingHorizontal: 12 },
  closeText: { color: "#315D4C", fontWeight: "700" },
  heading: { color: "#183D32", fontSize: 30, fontWeight: "700", letterSpacing: -0.8 },
  body: { color: "#52645B", fontSize: 15, lineHeight: 23 },
  progress: { color: "#315D4C", fontSize: 13, fontWeight: "700" },
  masteredProgress: { color: "#315D4C", fontSize: 12, fontWeight: "600", marginTop: 4 },
  modeSwitch: { flexDirection: "row", flexWrap: "wrap", gap: 8, backgroundColor: "#E9EDE7", padding: 4, borderRadius: 12 },
  modeButton: { flexGrow: 1, flexBasis: "45%", paddingVertical: 11, borderRadius: 9, alignItems: "center" },
  modeButtonActive: { backgroundColor: "#FFFFFF" },
  modeButtonText: { color: "#52645B", fontSize: 13, fontWeight: "600" },
  modeButtonTextActive: { color: "#214C3C", fontWeight: "700" },
  recallRow: { flexDirection: "column", gap: 10 },
  recallTile: { width: "100%", minWidth: 0, minHeight: 220, borderWidth: 1, borderColor: "#D5DDD4", borderRadius: 11, backgroundColor: "#F8F8F3", overflow: "hidden", alignItems: "center", justifyContent: "center", padding: 4 },
  recallNumber: { color: "#214C3C", fontSize: 12, fontWeight: "700", marginTop: 4 },
  progressTrack: { height: 7, backgroundColor: "#E2E8E1", borderRadius: 8, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#477C62", borderRadius: 8 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 22, padding: 18, gap: 14, borderWidth: 1, borderColor: "#E8E9E2" },
  image: { width: "100%", height: 220, borderRadius: 14, backgroundColor: "#E9ECE6" },
  mediaHeading: { alignItems: "flex-start" },
  mediaType: { color: "#64736B", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 },

  photoFallback: { gap: 8, alignItems: "center" },
  fallbackNotice: { color: "#6B776F", fontSize: 11, lineHeight: 16, textAlign: "center" },
  appleBody: { position: "absolute", top: 48, width: 94, height: 78, borderRadius: 38, backgroundColor: "#C94F45", borderWidth: 3, borderColor: "#9E3C36" },
  appleStem: { position: "absolute", top: 31, width: 8, height: 25, borderRadius: 4, backgroundColor: "#76513C", transform: [{ rotate: "12deg" }] },
  appleLeaf: { position: "absolute", top: 31, left: "53%", width: 26, height: 13, borderRadius: 14, backgroundColor: "#6D956A", transform: [{ rotate: "-25deg" }] },
  dogHead: { position: "absolute", top: 30, width: 76, height: 68, borderRadius: 34, backgroundColor: "#C99A69", alignItems: "center" },
  dogEarLeft: { position: "absolute", top: 34, left: "28%", width: 25, height: 47, borderRadius: 15, backgroundColor: "#936747", transform: [{ rotate: "-18deg" }] },
  dogEarRight: { position: "absolute", top: 34, right: "28%", width: 25, height: 47, borderRadius: 15, backgroundColor: "#936747", transform: [{ rotate: "18deg" }] },
  dogEyeLeft: { position: "absolute", top: 24, left: 20, width: 6, height: 7, borderRadius: 4, backgroundColor: "#263A32" },
  dogEyeRight: { position: "absolute", top: 24, right: 20, width: 6, height: 7, borderRadius: 4, backgroundColor: "#263A32" },
  dogMuzzle: { position: "absolute", top: 37, width: 38, height: 24, borderRadius: 15, backgroundColor: "#F2E4CF" },
  dogNose: { position: "absolute", top: 39, width: 11, height: 8, borderRadius: 6, backgroundColor: "#3A3833" },
  dogBody: { position: "absolute", bottom: 18, width: 82, height: 39, borderRadius: 22, backgroundColor: "#C99A69" },
  dogLegLeft: { position: "absolute", bottom: 7, left: "37%", width: 13, height: 25, borderRadius: 7, backgroundColor: "#936747" },
  dogLegRight: { position: "absolute", bottom: 7, right: "37%", width: 13, height: 25, borderRadius: 7, backgroundColor: "#936747" },
  dogTail: { position: "absolute", bottom: 43, right: "24%", width: 33, height: 10, borderRadius: 7, backgroundColor: "#936747", transform: [{ rotate: "-28deg" }] },
  illustrationCanvas: { width: "100%", height: 220, borderRadius: 14, backgroundColor: "#DDECE8", overflow: "hidden", alignItems: "center", justifyContent: "flex-end" },
  sun: { position: "absolute", top: 24, right: 34, width: 42, height: 42, borderRadius: 21, backgroundColor: "#F2C66D" },
  cloud: { position: "absolute", top: 45, left: 42, width: 75, height: 22, borderRadius: 14, backgroundColor: "#FFFFFF" },
  cloudLeft: { position: "absolute", left: 12, top: -10, width: 28, height: 28, borderRadius: 14, backgroundColor: "#FFFFFF" },
  cloudRight: { position: "absolute", right: 10, top: -8, width: 25, height: 25, borderRadius: 13, backgroundColor: "#FFFFFF" },
  houseRoof: { width: 0, height: 0, borderLeftWidth: 76, borderRightWidth: 76, borderBottomWidth: 76, borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomColor: "#B86D50", marginBottom: -2, zIndex: 2 },
  roofTriangle: { position: "absolute", top: 14, left: -61, width: 0, height: 0, borderLeftWidth: 61, borderRightWidth: 61, borderBottomWidth: 61, borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomColor: "#C9805E" },
  houseBody: { width: 124, height: 91, backgroundColor: "#F4D9A6", flexDirection: "row", alignItems: "flex-start", justifyContent: "space-around", paddingTop: 15, borderWidth: 2, borderColor: "#A65D45" },
  houseWindow: { width: 22, height: 22, backgroundColor: "#B7D8D8", borderWidth: 2, borderColor: "#FFFFFF" },
  houseWindowRight: { width: 22, height: 22, backgroundColor: "#B7D8D8", borderWidth: 2, borderColor: "#FFFFFF" },
  windowCrossVertical: { position: "absolute", left: 8, top: 0, width: 2, height: 18, backgroundColor: "#FFFFFF" },
  windowCrossHorizontal: { position: "absolute", left: 0, top: 8, width: 18, height: 2, backgroundColor: "#FFFFFF" },
  houseDoor: { width: 26, height: 58, backgroundColor: "#81513E", alignSelf: "flex-end", borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  ground: { width: "100%", height: 24, backgroundColor: "#8DB68C" },
  flowerStem: { position: "absolute", bottom: 21, left: 38, width: 3, height: 34, backgroundColor: "#4E895B", transform: [{ rotate: "8deg" }] },
  flowerHead: { position: "absolute", bottom: 51, left: 30, width: 18, height: 18, borderRadius: 9, backgroundColor: "#E9A2A0", borderWidth: 4, borderColor: "#F4C8A0" },
  coffeeSteamOne: { position: "absolute", top: 48, left: "46%", width: 3, height: 26, borderRadius: 3, backgroundColor: "#A8B6AC", transform: [{ rotate: "12deg" }] },
  coffeeSteamTwo: { position: "absolute", top: 38, left: "54%", width: 3, height: 30, borderRadius: 3, backgroundColor: "#A8B6AC", transform: [{ rotate: "-12deg" }] },
  coffeeCupHandle: { position: "absolute", top: 92, left: "58%", width: 42, height: 48, borderWidth: 9, borderColor: "#B86D50", borderLeftWidth: 0, borderTopRightRadius: 24, borderBottomRightRadius: 24 },
  coffeeCup: { position: "absolute", top: 88, left: "31%", width: 116, height: 78, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, backgroundColor: "#FFF9ED", borderWidth: 4, borderColor: "#B86D50", overflow: "hidden" },
  coffeeSurface: { width: "100%", height: 13, backgroundColor: "#81513E", borderBottomLeftRadius: 50, borderBottomRightRadius: 50 },
  coffeeSaucer: { position: "absolute", top: 164, left: "27%", width: 142, height: 13, borderRadius: 10, backgroundColor: "#D6E2DC", borderWidth: 2, borderColor: "#8FA89A" },
  busBody: { position: "absolute", top: 74, left: "12%", width: "76%", height: 88, borderRadius: 16, backgroundColor: "#E6B85C", borderWidth: 3, borderColor: "#9C7540", flexDirection: "row", alignItems: "flex-start", padding: 10, gap: 6 },
  busWindshield: { width: "23%", height: 34, borderRadius: 5, backgroundColor: "#B7D8D8" },
  busWindow: { width: "19%", height: 34, borderRadius: 5, backgroundColor: "#B7D8D8" },
  busDoor: { width: "17%", height: 61, marginTop: 0, backgroundColor: "#F5E7C9", borderWidth: 2, borderColor: "#9C7540" },
  busFrontLight: { position: "absolute", right: 2, top: 52, width: 9, height: 12, borderRadius: 4, backgroundColor: "#FFF4C7" },
  busWheelLeft: { position: "absolute", top: 145, left: "23%", width: 32, height: 32, borderRadius: 16, backgroundColor: "#3E4945", borderWidth: 5, borderColor: "#D9DED8" },
  busWheelRight: { position: "absolute", top: 145, right: "23%", width: 32, height: 32, borderRadius: 16, backgroundColor: "#3E4945", borderWidth: 5, borderColor: "#D9DED8" },
  busRoad: { position: "absolute", bottom: 27, width: "100%", height: 5, backgroundColor: "#9AA69D" },
  bookCover: { position: "absolute", top: 64, width: 190, height: 112, borderRadius: 12, backgroundColor: "#B86D50", padding: 9, flexDirection: "row", gap: 2, transform: [{ rotate: "-4deg" }] },
  bookPageLeft: { flex: 1, backgroundColor: "#FFF9ED", borderTopLeftRadius: 8, borderBottomLeftRadius: 8, padding: 12, gap: 10 },
  bookPageRight: { flex: 1, backgroundColor: "#FFF9ED", borderTopRightRadius: 8, borderBottomRightRadius: 8, padding: 12, gap: 10 },
  bookLine: { width: "100%", height: 3, borderRadius: 2, backgroundColor: "#A9B9AE" },
  bookLineShort: { width: "65%", height: 3, borderRadius: 2, backgroundColor: "#A9B9AE" },
  bookSpine: { position: "absolute", top: 9, bottom: 9, left: "50%", width: 3, backgroundColor: "#D6B28B" },
  prompt: { color: "#183D32", fontSize: 19, fontWeight: "700" },
  choicePrompt: { color: "#52645B", fontSize: 13, fontWeight: "600" },
  answerChoices: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  answerChoice: { minWidth: "30%", flexGrow: 1, borderWidth: 1, borderColor: "#D5DDD4", borderRadius: 11, paddingVertical: 12, paddingHorizontal: 10, alignItems: "center", backgroundColor: "#FFFFFF" },
  answerChoiceSelected: { borderColor: "#315D4C", backgroundColor: "#EAF0E9" },
  answerChoiceText: { color: "#29483D", fontSize: 14, fontWeight: "700" },
  input: { borderWidth: 1, borderColor: "#D5DDD4", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16, color: "#183D32" },
  primaryButton: { backgroundColor: "#214C3C", borderRadius: 12, paddingVertical: 14, paddingHorizontal: 18, alignItems: "center" },
  primaryButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  disabledButton: { opacity: 0.45 },
  correct: { color: "#26734B", fontSize: 15, fontWeight: "700" },
  incorrect: { color: "#9B5B2D", fontSize: 15, fontWeight: "700" },
  meaning: { padding: 14, borderRadius: 12, backgroundColor: "#F0F4EE", gap: 4 },
  meaningLabel: { color: "#64736B", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 },
  word: { color: "#183D32", fontSize: 25, fontWeight: "700" },
  revealButton: { alignItems: "center", paddingVertical: 10 },
  revealText: { color: "#315D4C", fontWeight: "700" },
  attribution: { gap: 4, paddingHorizontal: 2 },
  attributionTitle: { color: "#52645B", fontSize: 12, fontWeight: "700" },
  attributionText: { color: "#6B776F", fontSize: 11, lineHeight: 16 },
  sourceLink: { color: "#315D4C", fontSize: 11, textDecorationLine: "underline", marginTop: 3 },
});


export function TutorVisualVocabularyCard({
  entryId,
  learningLanguage,
  explanationLanguage,
}: {
  entryId: string;
  learningLanguage: LanguageCode;
  explanationLanguage: LanguageCode;
}) {
  const contentLanguage = resolveContentLanguage(learningLanguage);
  const explanationContentLanguage = resolveContentLanguage(explanationLanguage, contentLanguage);
  const entry = VISUAL_VOCABULARY.find((item) => item.id === entryId);
  if (!entry) return null;
  return (
    <View style={styles.tutorVisualCard}>
      {entry.mediaType === "illustration" ? (
        <VocabularyIllustration
          kind={entry.illustrationKind ?? "house"}
          label={entry.imageDescription[contentLanguage]}
        />
      ) : (
        <PhotoWithFallback
          uri={entry.image!}
          kind={entry.offlineFallbackIllustration!}
          label={entry.imageDescription[contentLanguage]}
          unavailableText={
            explanationLanguage === "es"
              ? "La foto no está disponible; se muestra una ilustración."
              : explanationLanguage === "en"
                ? "The photo is unavailable; an illustration is shown."
                : "Valokuva ei ole saatavilla; näytetään piirros."
          }
        />
      )}
      <Text style={styles.tutorVisualWord}>{entry.words[contentLanguage]}</Text>
      <Text style={styles.tutorVisualMeaning}>
        {entry.words[explanationContentLanguage]} · {entry.imageDescription[explanationContentLanguage]}
      </Text>
      <Text style={styles.attributionText}>
        {entry.source} · {entry.author} · {entry.license}
      </Text>
    </View>
  );
}
