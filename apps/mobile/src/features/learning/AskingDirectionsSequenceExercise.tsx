import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { LanguageCode } from "../../config/languages";
import { ASKING_DIRECTIONS_SEQUENCE } from "../../content/asking-directions-sequence";
import { resolveContentLanguage } from "../../services/content-language";
import { createAskingDirectionsRound, isNextAskingDirectionsStep } from "../../services/asking-directions-sequence";

const COPY = {
  fi: {
    title: "Kysy tietä",
    intro: "Harjoittele, miten löydät perille. Järjestä kuvat tilanteen luontevaan etenemisjärjestykseen.",
    progress: "Oikein järjestetyt vaiheet",
    retry: "Ei aivan. Mieti, mitä kannattaa tehdä ennen seuraavaa vaihetta.",
    step: "Vaihe",
    complete: "Hienoa! Osaat kysyä ja seurata reittiohjeita.",
    restart: "Harjoittele uudelleen",
    source: "Elovion alkuperäiset piirrokset · Tien kysyminen",
  },
  es: {
    title: "Preguntar cómo llegar",
    intro: "Practica cómo encontrar un lugar. Ordena las imágenes según el desarrollo natural de la situación.",
    progress: "Pasos ordenados correctamente",
    retry: "No exactamente. Piensa qué conviene hacer antes del siguiente paso.",
    step: "Paso",
    complete: "¡Muy bien! Sabes pedir y seguir indicaciones.",
    restart: "Practicar otra vez",
    source: "Ilustraciones originales de Elovio · Preguntar cómo llegar",
  },
  en: {
    title: "Ask for directions",
    intro: "Practise finding your way. Put the pictures in the natural order of the situation.",
    progress: "Steps in the correct order",
    retry: "Not quite. Think about what is useful to do before the next step.",
    step: "Step",
    complete: "Well done! You can ask for and follow directions.",
    restart: "Practise again",
    source: "Original Elovio illustrations · Asking for directions",
  },
} as const;

function DirectionsScene({ scene, label }: { scene: number; label: string }) {
  return (
    <View accessible accessibilityLabel={label} style={styles.scene}>
      <View style={styles.sky} />
      <View style={styles.ground} />
      {scene === 0 ? (
        <>
          <View style={styles.mapPaper}>
            <View style={styles.mapRoadVertical} />
            <View style={styles.mapRoadHorizontal} />
            <View style={styles.mapRoute} />
            <View style={styles.mapPin}><View style={styles.mapPinDot} /></View>
            <View style={styles.mapStart} />
          </View>
        </>
      ) : null}
      {scene === 1 ? (
        <>
          <View style={styles.personHead} />
          <View style={styles.personBody} />
          <View style={styles.personLegLeft} />
          <View style={styles.personLegRight} />
          <View style={styles.speechBubble}><Text style={styles.speechText}>?</Text></View>
          <View style={styles.otherHead} />
          <View style={styles.otherBody} />
        </>
      ) : null}
      {scene === 2 ? (
        <>
          <View style={styles.personHead} />
          <View style={styles.personBody} />
          <View style={styles.personLegLeft} />
          <View style={styles.personLegRight} />
          <View style={styles.speechBubbleWide}><Text style={styles.speechText}>←</Text><View style={styles.speechLine} /><View style={styles.speechLineShort} /></View>
          <View style={styles.otherHead} />
          <View style={styles.otherBody} />
        </>
      ) : null}
      {scene === 3 ? (
        <>
          <View style={styles.street} />
          <View style={styles.routeSign}><Text style={styles.routeArrow}>→</Text></View>
          <View style={styles.destination}><View style={styles.destinationRoof} /><View style={styles.destinationDoor} /><View style={styles.destinationWindow} /></View>
          <View style={styles.walkerHead} /><View style={styles.walkerBody} /><View style={styles.walkerLeg} />
        </>
      ) : null}
    </View>
  );
}

export function AskingDirectionsSequenceExercise({
  interfaceLanguage,
  learningLanguage,
}: {
  interfaceLanguage: LanguageCode;
  learningLanguage: LanguageCode;
}) {
  const language = interfaceLanguage === "fi" ? "fi" : interfaceLanguage === "es" ? "es" : "en";
  const t = COPY[language];
  const contentLanguage = resolveContentLanguage(learningLanguage);
  const [round, setRound] = useState(() => createAskingDirectionsRound());
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [incorrect, setIncorrect] = useState(false);
  const complete = selectedIds.length === ASKING_DIRECTIONS_SEQUENCE.length;
  const options = round.optionIds
    .map((id) => ASKING_DIRECTIONS_SEQUENCE.find((step) => step.id === id))
    .filter((step): step is (typeof ASKING_DIRECTIONS_SEQUENCE)[number] => Boolean(step));

  function restart() {
    setRound(createAskingDirectionsRound());
    setSelectedIds([]);
    setIncorrect(false);
  }

  function choose(id: string) {
    if (complete || selectedIds.includes(id)) return;
    if (!isNextAskingDirectionsStep(id, selectedIds.length)) {
      setIncorrect(true);
      return;
    }
    setIncorrect(false);
    setSelectedIds((current) => [...current, id]);
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t.title}</Text>
      <Text style={styles.body}>{t.intro}</Text>
      <Text style={styles.progress}>{t.progress}: {selectedIds.length} / 4</Text>
      <View style={styles.track}><View style={[styles.fill, { width: String(selectedIds.length * 25) + "%" }]} /></View>
      {complete ? (
        <>
          <Text accessibilityRole="text" style={styles.success}>{t.complete}</Text>
          {ASKING_DIRECTIONS_SEQUENCE.map((step) => (
            <View key={step.id} style={styles.completedRow}>
              <Text style={styles.number}>{step.order}</Text>
              <View style={styles.copy}>
                <Text style={styles.word}>{step.words[contentLanguage]}</Text>
                <Text style={styles.body}>{step.description[contentLanguage]}</Text>
              </View>
            </View>
          ))}
          <Pressable accessibilityRole="button" onPress={restart} style={styles.button}>
            <Text style={styles.buttonText}>{t.restart}</Text>
          </Pressable>
        </>
      ) : (
        <>
          <View style={styles.options}>
            {options.map((step) => {
              const selectedOrder = selectedIds.indexOf(step.id);
              return (
                <Pressable
                  key={step.id}
                  accessibilityRole="button"
                  accessibilityLabel={step.description[contentLanguage]}
                  accessibilityState={{ selected: selectedOrder >= 0 }}
                  disabled={selectedOrder >= 0}
                  onPress={() => choose(step.id)}
                  style={[styles.option, selectedOrder >= 0 && styles.selected]}
                >
                  <DirectionsScene scene={step.order - 1} label={step.description[contentLanguage]} />
                  {selectedOrder >= 0 ? <Text style={styles.selectedText}>{t.step} {selectedOrder + 1}: {step.words[contentLanguage]}</Text> : null}
                </Pressable>
              );
            })}
          </View>
          {incorrect ? <Text accessibilityRole="text" style={styles.error}>{t.retry}</Text> : null}
        </>
      )}
      <Text style={styles.attribution}>{t.source}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#FFFFFF", borderRadius: 22, padding: 18, gap: 14, borderWidth: 1, borderColor: "#E8E9E2" },
  title: { color: "#183D32", fontSize: 24, fontWeight: "700" },
  body: { color: "#52645B", fontSize: 13, lineHeight: 20 },
  progress: { color: "#315D4C", fontSize: 13, fontWeight: "700" },
  track: { height: 7, backgroundColor: "#E2E8E1", borderRadius: 8, overflow: "hidden" },
  fill: { height: "100%", backgroundColor: "#477C62", borderRadius: 8 },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  option: { width: "48%", minHeight: 164, borderWidth: 1, borderColor: "#D5DDD4", borderRadius: 13, backgroundColor: "#F8F8F3", overflow: "hidden", padding: 6, justifyContent: "space-between" },
  selected: { borderColor: "#477C62", backgroundColor: "#EAF0E9" },
  scene: { width: "100%", height: 132, borderRadius: 9, backgroundColor: "#E4ECE8", overflow: "hidden", alignItems: "center", justifyContent: "center" },
  sky: { position: "absolute", top: 0, width: "100%", height: "78%", backgroundColor: "#DDEAE8" },
  ground: { position: "absolute", bottom: 0, width: "100%", height: "22%", backgroundColor: "#A8B99D" },
  mapPaper: { width: 112, height: 96, backgroundColor: "#FFFDF4", borderWidth: 2, borderColor: "#C9C5B5", borderRadius: 8, overflow: "hidden" },
  mapRoadVertical: { position: "absolute", left: 42, top: -8, width: 18, height: 115, backgroundColor: "#D7D4C8", transform: [{ rotate: "18deg" }] },
  mapRoadHorizontal: { position: "absolute", top: 37, left: -8, width: 130, height: 16, backgroundColor: "#D7D4C8", transform: [{ rotate: "-12deg" }] },
  mapRoute: { position: "absolute", left: 28, top: 57, width: 60, height: 4, backgroundColor: "#477C62", transform: [{ rotate: "-30deg" }] },
  mapPin: { position: "absolute", top: 15, right: 19, width: 21, height: 21, borderRadius: 11, backgroundColor: "#B86D50", alignItems: "center", justifyContent: "center" },
  mapPinDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#FFFFFF" },
  mapStart: { position: "absolute", bottom: 13, left: 18, width: 12, height: 12, borderRadius: 6, backgroundColor: "#477C62", borderWidth: 2, borderColor: "#FFFFFF" },
  personHead: { position: "absolute", bottom: 83, left: "19%", width: 22, height: 22, borderRadius: 11, backgroundColor: "#D8A47D" },
  personBody: { position: "absolute", bottom: 35, left: "16%", width: 29, height: 48, borderRadius: 10, backgroundColor: "#547C70" },
  personLegLeft: { position: "absolute", bottom: 17, left: "18%", width: 8, height: 23, backgroundColor: "#425C53" },
  personLegRight: { position: "absolute", bottom: 17, left: "30%", width: 8, height: 23, backgroundColor: "#425C53" },
  speechBubble: { position: "absolute", top: 23, left: "40%", width: 40, height: 34, borderRadius: 12, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  speechBubbleWide: { position: "absolute", top: 16, left: "35%", width: 82, height: 48, borderRadius: 12, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", gap: 4 },
  speechText: { color: "#315D4C", fontSize: 17, fontWeight: "800" },
  speechLine: { width: 49, height: 3, borderRadius: 2, backgroundColor: "#AAB7AC" },
  speechLineShort: { width: 31, height: 3, borderRadius: 2, backgroundColor: "#AAB7AC" },
  otherHead: { position: "absolute", bottom: 83, right: "18%", width: 22, height: 22, borderRadius: 11, backgroundColor: "#C98F68" },
  otherBody: { position: "absolute", bottom: 35, right: "15%", width: 29, height: 48, borderRadius: 10, backgroundColor: "#B68A65" },
  street: { position: "absolute", bottom: 0, width: "100%", height: 43, backgroundColor: "#8B9B91" },
  routeSign: { position: "absolute", top: 20, left: "13%", width: 55, height: 38, backgroundColor: "#477C62", borderRadius: 5, alignItems: "center", justifyContent: "center" },
  routeArrow: { color: "#FFFFFF", fontSize: 25, fontWeight: "800" },
  destination: { position: "absolute", top: 23, right: "14%", width: 57, height: 75, backgroundColor: "#E8D5B7", borderWidth: 2, borderColor: "#9C876A" },
  destinationRoof: { position: "absolute", top: -16, left: -5, width: 63, height: 18, backgroundColor: "#B86D50", transform: [{ rotate: "-5deg" }] },
  destinationDoor: { position: "absolute", bottom: 0, left: 20, width: 17, height: 34, backgroundColor: "#8A6B52" },
  destinationWindow: { position: "absolute", top: 12, right: 5, width: 13, height: 13, backgroundColor: "#B8D8D8", borderWidth: 1, borderColor: "#FFFFFF" },
  walkerHead: { position: "absolute", bottom: 49, left: "29%", width: 18, height: 18, borderRadius: 9, backgroundColor: "#D8A47D" },
  walkerBody: { position: "absolute", bottom: 17, left: "27%", width: 22, height: 34, borderRadius: 8, backgroundColor: "#547C70" },
  walkerLeg: { position: "absolute", bottom: 5, left: "31%", width: 7, height: 17, backgroundColor: "#425C53" },
  selectedText: { color: "#315D4C", fontWeight: "700", fontSize: 11, padding: 4 },
  error: { color: "#A54A3F", fontSize: 13, fontWeight: "600" },
  success: { color: "#315D4C", fontSize: 16, fontWeight: "700" },
  completedRow: { flexDirection: "row", gap: 10, alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#E8E9E2" },
  number: { width: 28, height: 28, textAlign: "center", textAlignVertical: "center", borderRadius: 14, overflow: "hidden", backgroundColor: "#EAF0E9", color: "#315D4C", fontWeight: "800" },
  copy: { flex: 1, gap: 3 },
  word: { color: "#183D32", fontWeight: "700" },
  button: { padding: 13, backgroundColor: "#315D4C", borderRadius: 12, alignItems: "center" },
  buttonText: { color: "#FFFFFF", fontWeight: "700" },
  attribution: { color: "#7A867E", fontSize: 10, lineHeight: 15 },
});
