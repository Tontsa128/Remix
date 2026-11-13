import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { resolveContentLanguage } from "../../services/content-language.js";

const DOCTOR_SEQUENCE = [
  {
    id: "symptoms",
    order: 1,
    words: { fi: "kuvailla oireet", es: "describir los síntomas", en: "describe symptoms" },
    phrase: {
      fi: "Minulla on kuumetta ja kurkku on kipeä.",
      es: "Tengo fiebre y me duele la garganta.",
      en: "I have a fever and a sore throat.",
    },
    description: {
      fi: "Kerro lääkärille tai sairaanhoitajalle mihin sattuu ja milloin oireet alkoivat.",
      es: "Explica al médico o enfermero qué te duele y cuándo empezaron los síntomas.",
      en: "Tell the doctor or nurse what hurts and when symptoms started.",
    },
  },
  {
    id: "checkup",
    order: 2,
    words: { fi: "käydä tutkimuksessa", es: "pasar a la consulta", en: "undergo examination" },
    phrase: {
      fi: "Hengitä syvään, kuuntelen keuhkosi ja katson kurkkuun.",
      es: "Respire hondo, voy a auscultar sus pulmones y mirar su garganta.",
      en: "Breathe deeply, I will listen to your lungs and check your throat.",
    },
    description: {
      fi: "Lääkäri tekee tutkimuksen ja mittaa tarvittaessa kuumeen tai verenpaineen.",
      es: "El médico realiza la exploración y comprueba la temperatura o tensión.",
      en: "The doctor conducts an examination and checks temperature or blood pressure.",
    },
  },
  {
    id: "prescription",
    order: 3,
    words: { fi: "saada resepti ja ohjeet", es: "recibir la receta", en: "receive prescription" },
    phrase: {
      fi: "Kirjoitan sinulle reseptin. Lepää ja juo paljon vettä.",
      es: "Le receto este medicamento. Descanse y beba abundante agua.",
      en: "I am writing you a prescription. Rest and drink plenty of water.",
    },
    description: {
      fi: "Lääkäri antaa hoito-ohjeet ja sähköisen tai kirjallisen lääkemääräyksen.",
      es: "El médico da las pautas de recuperación y la receta del tratamiento.",
      en: "The doctor gives treatment guidelines and a medicine prescription.",
    },
  },
  {
    id: "pharmacy",
    order: 4,
    words: { fi: "noutaa lääkkeet apteekista", es: "recoger en la farmacia", en: "collect from pharmacy" },
    phrase: {
      fi: "Tässä on lääkkeenne. Ottakaa yksi tabletti aamuin illoin.",
      es: "Aquí tiene su medicina. Tome una pastilla por la mañana y otra por la noche.",
      en: "Here is your medication. Take one tablet morning and evening.",
    },
    description: {
      fi: "Käy apteekissa, esitä henkilökortti tai resepti ja kuuntele annosteluohjeet.",
      es: "Ve a la farmacia, presenta la receta y atiende a las instrucciones de toma.",
      en: "Visit the pharmacy, show prescription and listen to dosage instructions.",
    },
  },
];

const COPY = {
  fi: {
    title: "Lääkärissä ja apteekissa",
    intro: "Opi kuvailemaan oireita ja asioimaan terveydenhuollossa. Järjestä hoitopolun vaiheet oikeaan järjestykseen.",
    progress: "Oikein järjestetyt vaiheet",
    retry: "Mieti, mikä vaihe tapahtuu ennen tätä toimenpidettä.",
    step: "Vaihe",
    complete: "Erinomaista! Hallitset terveydenhuollon ja apteekkikäynnin perussanaston.",
    restart: "Harjoittele uudelleen",
    source: "Elovio kieliharjoitukset · Terveys & Ensiapu",
    listen: "Kuuntele lause",
    examplePhrase: "Hyödyllinen lause:",
  },
  es: {
    title: "En el médico y la farmacia",
    intro: "Aprende a describir síntomas y desenvolverte en el centro de salud. Ordena los pasos correctamente.",
    progress: "Pasos ordenados",
    retry: "Revisa qué paso conviene realizar antes.",
    step: "Paso",
    complete: "¡Excelente! Ya dominas las expresiones básicas de consulta médica y farmacia.",
    restart: "Practicar de nuevo",
    source: "Ejercicios Elovio · Salud y emergencias",
    listen: "Escuchar frase",
    examplePhrase: "Frase útil:",
  },
  en: {
    title: "At the Doctor & Pharmacy",
    intro: "Learn to describe symptoms and navigate medical appointments. Arrange the stages in order.",
    progress: "Ordered stages",
    retry: "Think about what naturally happens before this step.",
    step: "Step",
    complete: "Great job! You know the core healthcare and pharmacy phrases.",
    restart: "Practise again",
    source: "Elovio Language Practice · Health & Clinic",
    listen: "Listen",
    examplePhrase: "Useful phrase:",
  },
};

export function DoctorEmergencyExercise({
  interfaceLanguage = "fi",
  learningLanguage = "es",
}) {
  const language = interfaceLanguage === "es" ? "es" : interfaceLanguage === "en" ? "en" : "fi";
  const t = COPY[language];
  const contentLang = resolveContentLanguage(learningLanguage);

  const [selectedIds, setSelectedIds] = useState([]);
  const [incorrect, setIncorrect] = useState(false);

  const complete = selectedIds.length === DOCTOR_SEQUENCE.length;

  function shuffle(arr) {
    return [...arr].sort(() => Math.random() - 0.5);
  }

  const [shuffledOptions] = useState(() => shuffle(DOCTOR_SEQUENCE.map((s) => s.id)));

  function restart() {
    setSelectedIds([]);
    setIncorrect(false);
  }

  function choose(id) {
    if (complete || selectedIds.includes(id)) return;
    const nextStep = DOCTOR_SEQUENCE[selectedIds.length];
    if (nextStep?.id !== id) {
      setIncorrect(true);
      return;
    }
    setIncorrect(false);
    setSelectedIds((prev) => [...prev, id]);
  }

  function playAudio(text, lang) {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const codeMap = { fi: "fi-FI", es: "es-ES", en: "en-US" };
      u.lang = codeMap[lang] || "en-US";
      window.speechSynthesis.speak(u);
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.badgeRow}>
        <Text style={styles.eyebrow}>TERVEYS & HYVINVOINTI</Text>
      </View>
      <Text style={styles.title}>{t.title}</Text>
      <Text style={styles.body}>{t.intro}</Text>
      <Text style={styles.progress}>{t.progress}: {selectedIds.length} / {DOCTOR_SEQUENCE.length}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${(selectedIds.length / DOCTOR_SEQUENCE.length) * 100}%` }]} />
      </View>

      {complete ? (
        <View style={styles.completedContainer}>
          <Text style={styles.success}>{t.complete}</Text>
          {DOCTOR_SEQUENCE.map((step) => (
            <View key={step.id} style={styles.summaryRow}>
              <View style={styles.numberBadge}><Text style={styles.numberBadgeText}>{step.order}</Text></View>
              <View style={styles.summaryCopy}>
                <Text style={styles.stepTitle}>{step.words[contentLang]}</Text>
                <Text style={styles.phraseText}>"{step.phrase[contentLang]}"</Text>
                <Text style={styles.descText}>{step.description[contentLang]}</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => playAudio(step.phrase[contentLang], contentLang)}
                  style={styles.listenButton}
                >
                  <Text style={styles.listenButtonText}>🔊 {t.listen}</Text>
                </Pressable>
              </View>
            </View>
          ))}
          <Pressable accessibilityRole="button" onPress={restart} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{t.restart}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.optionsGrid}>
          {shuffledOptions.map((id) => {
            const step = DOCTOR_SEQUENCE.find((s) => s.id === id);
            if (!step) return null;
            const chosenIndex = selectedIds.indexOf(id);
            const isChosen = chosenIndex >= 0;
            return (
              <Pressable
                key={id}
                accessibilityRole="button"
                disabled={isChosen}
                onPress={() => choose(id)}
                style={[styles.optionCard, isChosen && styles.optionCardSelected]}
              >
                <View style={styles.optionHeader}>
                  <Text style={styles.optionIcon}>{id === "symptoms" ? "🤒" : id === "checkup" ? "🩺" : id === "prescription" ? "📋" : "💊"}</Text>
                  {isChosen ? (
                    <View style={styles.checkPill}><Text style={styles.checkPillText}>✓ {t.step} {chosenIndex + 1}</Text></View>
                  ) : null}
                </View>
                <Text style={styles.optionWord}>{step.words[contentLang]}</Text>
                <Text style={styles.optionDesc}>{step.description[contentLang]}</Text>
                <View style={styles.quoteBox}>
                  <Text style={styles.quoteLabel}>{t.examplePhrase}</Text>
                  <Text style={styles.quoteText}>"{step.phrase[contentLang]}"</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {incorrect ? <Text style={styles.errorText}>{t.retry}</Text> : null}
      <Text style={styles.attribution}>{t.source}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#FFFFFF", borderRadius: 22, padding: 20, gap: 14, borderWidth: 1, borderColor: "#E2E8F0" },
  badgeRow: { flexDirection: "row" },
  eyebrow: { color: "#0F766E", fontSize: 11, fontWeight: "700", letterSpacing: 1.5 },
  title: { color: "#0F172A", fontSize: 24, fontWeight: "700", letterSpacing: -0.5 },
  body: { color: "#475569", fontSize: 14, lineHeight: 22 },
  progress: { color: "#0F766E", fontSize: 13, fontWeight: "700" },
  track: { height: 8, backgroundColor: "#F1F5F9", borderRadius: 8, overflow: "hidden" },
  fill: { height: "100%", backgroundColor: "#0D9488", borderRadius: 8 },
  optionsGrid: { gap: 12 },
  optionCard: { padding: 16, borderRadius: 14, backgroundColor: "#F8FAFC", borderWidth: 1.5, borderColor: "#E2E8F0", gap: 6 },
  optionCardSelected: { backgroundColor: "#F0FDFA", borderColor: "#0D9488" },
  optionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  optionIcon: { fontSize: 24 },
  checkPill: { backgroundColor: "#0D9488", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  checkPillText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  optionWord: { color: "#0F172A", fontSize: 16, fontWeight: "700", textTransform: "capitalize" },
  optionDesc: { color: "#64748B", fontSize: 13, lineHeight: 18 },
  quoteBox: { marginTop: 4, padding: 8, backgroundColor: "#FFFFFF", borderRadius: 8, borderWidth: 1, borderColor: "#E2E8F0" },
  quoteLabel: { color: "#94A3B8", fontSize: 10, fontWeight: "600", textTransform: "uppercase" },
  quoteText: { color: "#0F766E", fontSize: 13, fontWeight: "600", marginTop: 2 },
  errorText: { color: "#DC2626", fontSize: 13, fontWeight: "600" },
  attribution: { color: "#94A3B8", fontSize: 11 },
  completedContainer: { gap: 14 },
  success: { color: "#0F766E", fontSize: 17, fontWeight: "700" },
  summaryRow: { flexDirection: "row", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  numberBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#CCFBF1", alignItems: "center", justifyContent: "center" },
  numberBadgeText: { color: "#0F766E", fontWeight: "800", fontSize: 13 },
  summaryCopy: { flex: 1, gap: 4 },
  stepTitle: { color: "#0F172A", fontSize: 15, fontWeight: "700" },
  phraseText: { color: "#0D9488", fontSize: 14, fontWeight: "600", fontStyle: "italic" },
  descText: { color: "#64748B", fontSize: 12 },
  listenButton: { marginTop: 4, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, backgroundColor: "#F0FDFA", borderRadius: 6, borderWidth: 1, borderColor: "#99F6E4" },
  listenButtonText: { color: "#0F766E", fontSize: 12, fontWeight: "600" },
  primaryButton: { minHeight: 46, borderRadius: 12, backgroundColor: "#0F766E", alignItems: "center", justifyContent: "center", marginTop: 8 },
  primaryButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
});
