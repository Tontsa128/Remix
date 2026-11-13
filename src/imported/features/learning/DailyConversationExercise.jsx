import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { resolveContentLanguage } from "../../services/content-language.js";

const CONVERSATION_DIALOGUE = [
  {
    id: "turn-1",
    speaker: "A",
    speakerName: { fi: "Emma", es: "Emma", en: "Emma" },
    text: {
      fi: "Hei! Hauska tutustua, minun nimeni on Emma.",
      es: "¡Hola! Mucho gusto, me llamo Emma.",
      en: "Hello! Nice to meet you, my name is Emma.",
    },
    options: [
      {
        id: "opt-1a",
        isCorrect: true,
        text: {
          fi: "Hei Emma! Minun nimeni on Toni. Mitä kuuluu?",
          es: "¡Hola Emma! Me llamo Toni. ¿Cómo estás?",
          en: "Hi Emma! My name is Toni. How are you?",
        },
      },
      {
        id: "opt-1b",
        isCorrect: false,
        text: {
          fi: "Kello on kolme iltapäivällä.",
          es: "Son las tres de la tarde.",
          en: "It is three in the afternoon.",
        },
      },
    ],
  },
  {
    id: "turn-2",
    speaker: "A",
    speakerName: { fi: "Emma", es: "Emma", en: "Emma" },
    text: {
      fi: "Kiitos oikein hyvää! Mistä olet kotoisin?",
      es: "¡Muy bien, gracias! ¿De dónde eres?",
      en: "Very well, thank you! Where are you from?",
    },
    options: [
      {
        id: "opt-2a",
        isCorrect: true,
        text: {
          fi: "Olen kotoisin Suomesta ja opiskelen uusia kieliä.",
          es: "Soy de Finlandia y estoy aprendiendo nuevos idiomas.",
          en: "I am from Finland and I am learning new languages.",
        },
      },
      {
        id: "opt-2b",
        isCorrect: false,
        text: {
          fi: "Tämä kahvi on liian kuumaa.",
          es: "Este café está demasiado caliente.",
          en: "This coffee is too hot.",
        },
      },
    ],
  },
  {
    id: "turn-3",
    speaker: "A",
    speakerName: { fi: "Emma", es: "Emma", en: "Emma" },
    text: {
      fi: "Hienoa! Puhutko myös englantia tai espanjaa?",
      es: "¡Qué bien! ¿Hablas también inglés o español?",
      en: "Awesome! Do you also speak English or Spanish?",
    },
    options: [
      {
        id: "opt-3a",
        isCorrect: true,
        text: {
          fi: "Kyllä, puhun vähän molempia ja harjoittelen joka päivä.",
          es: "Sí, hablo un poco de ambos y practico todos los días.",
          en: "Yes, I speak a little of both and practice every day.",
        },
      },
      {
        id: "opt-3b",
        isCorrect: false,
        text: {
          fi: "Lippuni on kadonnut juna-asemalla.",
          es: "He perdido mi billete en la estación.",
          en: "I lost my ticket at the train station.",
        },
      },
    ],
  },
  {
    id: "turn-4",
    speaker: "A",
    speakerName: { fi: "Emma", es: "Emma", en: "Emma" },
    text: {
      fi: "Olipa mukava jutella! Nähdään pian, mukavaa päivää!",
      es: "¡Qué agradable conversar! ¡Nos vemos pronto, que tengas un buen día!",
      en: "It was so nice talking to you! See you soon, have a great day!",
    },
    options: [
      {
        id: "opt-4a",
        isCorrect: true,
        text: {
          fi: "Kiitos samoin! Nähdään taas!",
          es: "¡Igualmente! ¡Hasta pronto!",
          en: "Thank you, same to you! See you again!",
        },
      },
      {
        id: "opt-4b",
        isCorrect: false,
        text: {
          fi: "Tilaan kaksi omenamehua.",
          es: "Pido dos zumos de manzana.",
          en: "I order two apple juices.",
        },
      },
    ],
  },
];

const COPY = {
  fi: {
    title: "Arkikeskustelut ja esittäytyminen",
    intro: "Keskustele Emman kanssa. Valitse luontevin ja kohteliain vastaus vuoropuhelussa.",
    progress: "Keskustelun eteneminen",
    turn: "Vuoro",
    correct: "Hienoa! Vastasit luontevasti ja keskustelu etenee.",
    incorrect: "Tämä vastaus ei sovi tilanteen aiheeseen. Kokeile toista vaihtoehtoa.",
    complete: "Loistavaa! Keskustelu sujui luontevasti ja kohteliaasti.",
    restart: "Keskustele uudelleen",
    listen: "Kuuntele lausunta",
    you: "Sinä",
  },
  es: {
    title: "Conversación cotidiana y saludos",
    intro: "Conversa con Emma. Elige la respuesta más natural y adecuada en cada momento.",
    progress: "Progreso de la conversación",
    turn: "Turno",
    correct: "¡Muy bien! Respuesta natural, la charla continúa.",
    incorrect: "Esa opción no encaja con el contexto. Prueba de nuevo.",
    complete: "¡Excelente! Has completado la conversación con soltura y cortesía.",
    restart: "Repetir conversación",
    listen: "Escuchar",
    you: "Tú",
  },
  en: {
    title: "Daily Conversation & Greetings",
    intro: "Chat with Emma. Pick the most natural and polite response at each turn.",
    progress: "Conversation progress",
    turn: "Turn",
    correct: "Great! Natural response, the dialogue continues.",
    incorrect: "That response does not fit the context. Try the other option.",
    complete: "Brilliant! You completed the conversation naturally and politely.",
    restart: "Practise again",
    listen: "Listen",
    you: "You",
  },
};

export function DailyConversationExercise({
  interfaceLanguage = "fi",
  learningLanguage = "es",
}) {
  const language = interfaceLanguage === "es" ? "es" : interfaceLanguage === "en" ? "en" : "fi";
  const t = COPY[language];
  const contentLang = resolveContentLanguage(learningLanguage);

  const [stepIndex, setStepIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");

  const currentTurn = CONVERSATION_DIALOGUE[stepIndex];
  const complete = stepIndex >= CONVERSATION_DIALOGUE.length;

  function chooseOption(opt) {
    if (complete) return;
    if (!opt.isCorrect) {
      setErrorMsg(t.incorrect);
      return;
    }
    setErrorMsg("");
    setSelectedAnswers((prev) => [...prev, { prompt: currentTurn, chosen: opt }]);
    setStepIndex((prev) => prev + 1);
  }

  function restart() {
    setStepIndex(0);
    setSelectedAnswers([]);
    setErrorMsg("");
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
      <Text style={styles.eyebrow}>ARKIKIELELLINEN VUOROPUHELU</Text>
      <Text style={styles.title}>{t.title}</Text>
      <Text style={styles.body}>{t.intro}</Text>
      <Text style={styles.progress}>{t.progress}: {Math.min(stepIndex, CONVERSATION_DIALOGUE.length)} / {CONVERSATION_DIALOGUE.length}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${(Math.min(stepIndex, CONVERSATION_DIALOGUE.length) / CONVERSATION_DIALOGUE.length) * 100}%` }]} />
      </View>

      {/* History of completed turns */}
      <View style={styles.chatStream}>
        {selectedAnswers.map((item, idx) => (
          <View key={idx} style={styles.chatPair}>
            <View style={styles.bubblePartner}>
              <Text style={styles.bubbleAuthor}>{item.prompt.speakerName[contentLang]}</Text>
              <Text style={styles.bubbleText}>{item.prompt.text[contentLang]}</Text>
              <Pressable accessibilityRole="button" onPress={() => playAudio(item.prompt.text[contentLang], contentLang)} style={styles.miniAudio}>
                <Text style={styles.miniAudioText}>🔊</Text>
              </Pressable>
            </View>
            <View style={styles.bubbleYou}>
              <Text style={styles.bubbleAuthorYou}>{t.you}</Text>
              <Text style={styles.bubbleTextYou}>{item.chosen.text[contentLang]}</Text>
              <Pressable accessibilityRole="button" onPress={() => playAudio(item.chosen.text[contentLang], contentLang)} style={styles.miniAudio}>
                <Text style={styles.miniAudioText}>🔊</Text>
              </Pressable>
            </View>
          </View>
        ))}

        {!complete && currentTurn ? (
          <View style={styles.currentTurnContainer}>
            <View style={styles.bubblePartnerActive}>
              <View style={styles.partnerHeader}>
                <Text style={styles.partnerAvatar}>👩‍💼</Text>
                <Text style={styles.bubbleAuthor}>{currentTurn.speakerName[contentLang]}</Text>
              </View>
              <Text style={styles.activePromptText}>{currentTurn.text[contentLang]}</Text>
              <Pressable accessibilityRole="button" onPress={() => playAudio(currentTurn.text[contentLang], contentLang)} style={styles.listenChip}>
                <Text style={styles.listenChipText}>🔊 {t.listen}</Text>
              </Pressable>
            </View>

            <View style={styles.promptAnswers}>
              <Text style={styles.chooseLabel}>Valitse vastauksesi:</Text>
              {currentTurn.options.map((opt) => (
                <Pressable
                  key={opt.id}
                  accessibilityRole="button"
                  onPress={() => chooseOption(opt)}
                  style={styles.answerCard}
                >
                  <Text style={styles.answerCardText}>"{opt.text[contentLang]}"</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
      </View>

      {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

      {complete ? (
        <View style={styles.completeBox}>
          <Text style={styles.completeText}>{t.complete}</Text>
          <Pressable accessibilityRole="button" onPress={restart} style={styles.restartButton}>
            <Text style={styles.restartButtonText}>{t.restart}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#FFFFFF", borderRadius: 22, padding: 20, gap: 14, borderWidth: 1, borderColor: "#E2E8F0" },
  eyebrow: { color: "#2563EB", fontSize: 11, fontWeight: "700", letterSpacing: 1.5 },
  title: { color: "#0F172A", fontSize: 24, fontWeight: "700", letterSpacing: -0.5 },
  body: { color: "#475569", fontSize: 14, lineHeight: 22 },
  progress: { color: "#2563EB", fontSize: 13, fontWeight: "700" },
  track: { height: 8, backgroundColor: "#F1F5F9", borderRadius: 8, overflow: "hidden" },
  fill: { height: "100%", backgroundColor: "#3B82F6", borderRadius: 8 },
  chatStream: { gap: 14, marginTop: 6 },
  chatPair: { gap: 8 },
  bubblePartner: { alignSelf: "flex-start", maxWidth: "88%", backgroundColor: "#F1F5F9", padding: 12, borderRadius: 14, gap: 4 },
  bubbleAuthor: { fontSize: 11, fontWeight: "700", color: "#64748B" },
  bubbleText: { fontSize: 14, color: "#1E293B", lineHeight: 20 },
  bubbleYou: { alignSelf: "flex-end", maxWidth: "88%", backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#BFDBFE", padding: 12, borderRadius: 14, gap: 4 },
  bubbleAuthorYou: { fontSize: 11, fontWeight: "700", color: "#2563EB", textAlign: "right" },
  bubbleTextYou: { fontSize: 14, color: "#1E40AF", lineHeight: 20 },
  miniAudio: { marginTop: 2, alignSelf: "flex-start" },
  miniAudioText: { fontSize: 12 },
  currentTurnContainer: { gap: 14, marginTop: 4 },
  bubblePartnerActive: { backgroundColor: "#F8FAFC", borderWidth: 1.5, borderColor: "#CBD5E1", padding: 16, borderRadius: 16, gap: 8 },
  partnerHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  partnerAvatar: { fontSize: 20 },
  activePromptText: { fontSize: 16, fontWeight: "600", color: "#0F172A", lineHeight: 24 },
  listenChip: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, backgroundColor: "#E2E8F0", borderRadius: 6 },
  listenChipText: { fontSize: 12, fontWeight: "600", color: "#334155" },
  promptAnswers: { gap: 8 },
  chooseLabel: { fontSize: 12, fontWeight: "700", color: "#64748B", textTransform: "uppercase" },
  answerCard: { padding: 14, borderRadius: 12, backgroundColor: "#FFFFFF", borderWidth: 1.5, borderColor: "#3B82F6" },
  answerCardText: { fontSize: 14, color: "#1E3A8A", fontWeight: "600", lineHeight: 20 },
  errorText: { color: "#DC2626", fontSize: 13, fontWeight: "600" },
  completeBox: { marginTop: 10, padding: 16, borderRadius: 14, backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#BBF7D0", gap: 10, alignItems: "center" },
  completeText: { color: "#166534", fontSize: 16, fontWeight: "700", textAlign: "center" },
  restartButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: "#166534" },
  restartButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
});
