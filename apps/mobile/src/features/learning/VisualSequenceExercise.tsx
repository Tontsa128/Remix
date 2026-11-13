import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { LanguageCode } from "../../config/languages";
import { resolveContentLanguage } from "../../services/content-language";
import { COFFEE_PREPARATION_SEQUENCE } from "../../content/visual-sequences";
import { createVisualSequenceRound, isNextVisualSequenceStep } from "../../services/visual-sequence";

const COPY = {
  fi: {
    title: "Valmista kahvia",
    intro: "Kahvin valmistuksessa on selkeä järjestys. Valitse kuvat oikeassa järjestyksessä alusta loppuun.",
    progress: "Oikein järjestetyt vaiheet",
    retry: "Ei vielä. Mieti, mitä pitää tehdä ensin.",
    step: "Vaihe",
    complete: "Hienosti tehty! Järjestit kahvin valmistuksen vaiheet oikein.",
    restart: "Harjoittele uudelleen",
    source: "Alkuperäiset Elovio-piirrokset · Suodatinkahvin valmistus",
  },
  es: {
    title: "Prepara café",
    intro: "Preparar café tiene un orden lógico. Elige las imágenes en el orden correcto, desde el principio hasta el final.",
    progress: "Pasos ordenados correctamente",
    retry: "Todavía no. Piensa qué hay que hacer primero.",
    step: "Paso",
    complete: "¡Muy bien! Has ordenado correctamente los pasos para preparar café.",
    restart: "Practicar otra vez",
    source: "Ilustraciones originales de Elovio · Preparación de café filtrado",
  },
  en: {
    title: "Make a cup of coffee",
    intro: "Making coffee follows a clear sequence. Choose the pictures in the correct order, from start to finish.",
    progress: "Steps in the correct order",
    retry: "Not quite. Think about what needs to happen first.",
    step: "Step",
    complete: "Well done! You put the coffee-making steps in the correct order.",
    restart: "Practise again",
    source: "Original Elovio illustrations · Filter coffee preparation",
  },
} as const;

type SequenceLanguage = keyof typeof COPY;

function CoffeeStepIllustration({ step, label }: { step: number; label: string }) {
  return (
    <View accessible accessibilityLabel={label} style={styles.scene}>
      <View style={styles.counter} />
      {step === 0 ? (
        <>
          <View style={styles.tap} />
          <View style={styles.waterStream} />
          <View style={styles.kettle}>
            <View style={styles.kettleWater} />
            <View style={styles.kettleHandle} />
            <View style={styles.kettleSpout} />
          </View>
        </>
      ) : null}
      {step === 1 ? (
        <>
          <View style={styles.steamA} />
          <View style={styles.steamB} />
          <View style={styles.kettle}>
            <View style={styles.kettleWater} />
            <View style={styles.kettleHandle} />
            <View style={styles.kettleSpout} />
          </View>
          <View style={styles.heatBase} />
        </>
      ) : null}
      {step === 2 ? (
        <>
          <View style={styles.filterTop} />
          <View style={styles.filterBody}>
            <View style={styles.groundCoffee} />
          </View>
          <View style={styles.filterStand} />
          <View style={styles.coffeeCupSmall} />
        </>
      ) : null}
      {step === 3 ? (
        <>
          <View style={styles.pourStream} />
          <View style={styles.pourKettle}>
            <View style={styles.kettleHandle} />
            <View style={styles.kettleSpout} />
          </View>
          <View style={styles.filterBodyFinal}>
            <View style={styles.groundCoffee} />
          </View>
          <View style={styles.servingCup}>
            <View style={styles.coffeeSurface} />
          </View>
        </>
      ) : null}
    </View>
  );
}

export function VisualSequenceExercise({
  interfaceLanguage,
  learningLanguage,
}: {
  interfaceLanguage: LanguageCode;
  learningLanguage: LanguageCode;
}) {
  const language: SequenceLanguage = interfaceLanguage === "fi" ? "fi" : interfaceLanguage === "es" ? "es" : "en";
  const t = COPY[language];
  const contentLanguage = resolveContentLanguage(learningLanguage);
  const [round, setRound] = useState(() => createVisualSequenceRound());
  const [nextIndex, setNextIndex] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [incorrect, setIncorrect] = useState(false);
  const complete = nextIndex === COFFEE_PREPARATION_SEQUENCE.length;

  function choose(id: string) {
    if (!round || complete || selectedIds.includes(id)) return;
    if (!isNextVisualSequenceStep(id, nextIndex)) {
      setIncorrect(true);
      return;
    }
    setIncorrect(false);
    setSelectedIds((current) => [...current, id]);
    setNextIndex((current) => current + 1);
  }

  function restart() {
    setRound(createVisualSequenceRound());
    setNextIndex(0);
    setSelectedIds([]);
    setIncorrect(false);
  }

  const options = round?.optionIds
    .map((id) => COFFEE_PREPARATION_SEQUENCE.find((step) => step.id === id))
    .filter((step): step is (typeof COFFEE_PREPARATION_SEQUENCE)[number] => Boolean(step)) ?? [];

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t.title}</Text>
      <Text style={styles.body}>{t.intro}</Text>
      <Text style={styles.progress}>{t.progress}: {nextIndex} / {COFFEE_PREPARATION_SEQUENCE.length}</Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: String((nextIndex / COFFEE_PREPARATION_SEQUENCE.length) * 100) + "%" }]} />
      </View>
      {complete ? (
        <>
          <Text accessibilityRole="text" style={styles.success}>{t.complete}</Text>
          <View style={styles.completedList}>
            {COFFEE_PREPARATION_SEQUENCE.map((step) => (
              <View key={step.id} style={styles.completedRow}>
                <Text style={styles.completedNumber}>{step.order}</Text>
                <View style={styles.completedCopy}>
                  <Text style={styles.completedWord}>{step.words[contentLanguage]}</Text>
                  <Text style={styles.completedDescription}>{step.description[contentLanguage]}</Text>
                </View>
              </View>
            ))}
          </View>
          <Pressable accessibilityRole="button" onPress={restart} style={styles.primaryButton}>
            <Text style={styles.buttonText}>{t.restart}</Text>
          </Pressable>
        </>
      ) : (
        <>
          <View style={styles.options}>
            {options.map((step) => {
              const selectedOrder = selectedIds.indexOf(step.id);
              const isSelected = selectedOrder >= 0;
              return (
                <Pressable
                  key={step.id}
                  accessibilityRole="button"
                  accessibilityLabel={step.description[contentLanguage]}
                  accessibilityState={{ selected: isSelected, disabled: isSelected }}
                  disabled={isSelected}
                  onPress={() => choose(step.id)}
                  style={[styles.option, isSelected && styles.optionSelected]}
                >
                  <CoffeeStepIllustration step={step.illustrationStep} label={step.description[contentLanguage]} />
                  {isSelected ? (
                    <Text style={styles.selectedStep}>{t.step} {selectedOrder + 1}: {step.words[contentLanguage]}</Text>
                  ) : null}
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
  body: { color: "#52645B", fontSize: 14, lineHeight: 22 },
  progress: { color: "#315D4C", fontSize: 13, fontWeight: "700" },
  progressTrack: { height: 7, backgroundColor: "#E2E8E1", borderRadius: 8, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#477C62", borderRadius: 8 },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  option: { width: "48%", minHeight: 170, borderWidth: 1, borderColor: "#D5DDD4", borderRadius: 13, backgroundColor: "#F8F8F3", overflow: "hidden", padding: 6, justifyContent: "space-between" },
  optionSelected: { borderColor: "#477C62", backgroundColor: "#EAF0E9" },
  scene: { width: "100%", height: 130, borderRadius: 9, backgroundColor: "#DDECE8", overflow: "hidden", alignItems: "center", justifyContent: "flex-end" },
  counter: { position: "absolute", bottom: 16, width: "100%", height: 18, backgroundColor: "#C9A982" },
  kettle: { position: "absolute", bottom: 33, left: "27%", width: 84, height: 63, borderRadius: 24, backgroundColor: "#E9E5D9", borderWidth: 3, borderColor: "#83958A", alignItems: "center", justifyContent: "flex-end" },
  kettleWater: { width: "75%", height: 22, backgroundColor: "#8FC6D0", borderBottomLeftRadius: 18, borderBottomRightRadius: 18, marginBottom: 5 },
  kettleHandle: { position: "absolute", right: -22, top: 10, width: 26, height: 37, borderWidth: 6, borderColor: "#83958A", borderLeftWidth: 0, borderTopRightRadius: 16, borderBottomRightRadius: 16 },
  kettleSpout: { position: "absolute", left: -24, top: 17, width: 28, height: 12, backgroundColor: "#E9E5D9", borderWidth: 2, borderColor: "#83958A", transform: [{ rotate: "-12deg" }] },
  tap: { position: "absolute", top: 23, left: "18%", width: 28, height: 25, borderTopWidth: 7, borderLeftWidth: 6, borderColor: "#84978C", borderTopLeftRadius: 5 },
  waterStream: { position: "absolute", top: 47, left: "26%", width: 4, height: 35, backgroundColor: "#75B8CA" },
  heatBase: { position: "absolute", bottom: 20, width: 94, height: 7, borderRadius: 5, backgroundColor: "#6C7972" },
  steamA: { position: "absolute", top: 19, left: "43%", width: 5, height: 24, borderRadius: 5, backgroundColor: "#FFFFFF", transform: [{ rotate: "12deg" }] },
  steamB: { position: "absolute", top: 14, left: "55%", width: 5, height: 28, borderRadius: 5, backgroundColor: "#FFFFFF", transform: [{ rotate: "-12deg" }] },
  filterTop: { position: "absolute", top: 30, width: 92, height: 9, borderRadius: 4, backgroundColor: "#B7A18A" },
  filterBody: { position: "absolute", top: 39, width: 74, height: 55, borderLeftWidth: 3, borderRightWidth: 3, borderBottomWidth: 3, borderColor: "#B7A18A", backgroundColor: "#FFF9ED", alignItems: "center", justifyContent: "center" },
  groundCoffee: { width: 52, height: 12, borderRadius: 10, backgroundColor: "#81513E" },
  filterStand: { position: "absolute", top: 94, width: 94, height: 6, backgroundColor: "#A7B8AC" },
  coffeeCupSmall: { position: "absolute", bottom: 16, width: 48, height: 25, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, backgroundColor: "#F8F4E8", borderWidth: 2, borderColor: "#B86D50" },
  pourStream: { position: "absolute", top: 52, left: "53%", width: 4, height: 46, backgroundColor: "#75B8CA", transform: [{ rotate: "-8deg" }] },
  pourKettle: { position: "absolute", top: 14, left: "43%", width: 62, height: 44, borderRadius: 16, backgroundColor: "#E9E5D9", borderWidth: 3, borderColor: "#83958A", transform: [{ rotate: "18deg" }] },
  filterBodyFinal: { position: "absolute", top: 64, left: "27%", width: 70, height: 42, borderLeftWidth: 3, borderRightWidth: 3, borderBottomWidth: 3, borderColor: "#B7A18A", backgroundColor: "#FFF9ED", alignItems: "center", justifyContent: "center" },
  servingCup: { position: "absolute", bottom: 16, left: "32%", width: 68, height: 39, borderBottomLeftRadius: 14, borderBottomRightRadius: 14, backgroundColor: "#FFF9ED", borderWidth: 3, borderColor: "#B86D50", alignItems: "center" },
  coffeeSurface: { width: "85%", height: 7, marginTop: 3, borderRadius: 6, backgroundColor: "#81513E" },
  selectedStep: { color: "#315D4C", fontSize: 11, fontWeight: "700", textAlign: "center", paddingVertical: 3 },
  completedList: { gap: 9 },
  completedRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 11, borderRadius: 10, backgroundColor: "#F0F4EE" },
  completedNumber: { color: "#315D4C", fontSize: 16, fontWeight: "800", width: 20 },
  completedCopy: { flex: 1, gap: 3 },
  completedWord: { color: "#183D32", fontSize: 14, fontWeight: "700" },
  completedDescription: { color: "#52645B", fontSize: 12, lineHeight: 18 },
  primaryButton: { backgroundColor: "#214C3C", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  buttonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  success: { color: "#26734B", fontSize: 15, lineHeight: 22, fontWeight: "700" },
  error: { color: "#9B5B2D", fontSize: 14, fontWeight: "600" },
  attribution: { color: "#6B776F", fontSize: 11, lineHeight: 16 },
});
