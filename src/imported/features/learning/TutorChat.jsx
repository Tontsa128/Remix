import { useState } from "react";
import { requestElovioApi } from '../../services/api-client';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View, } from "react-native";
import { supabase } from "../../lib/supabase";
import { loadLocalLearningProgress } from "../../services/local-learning-progress";
import { getDuePhraseIds } from "../../services/spaced-repetition";
import { loadVisualVocabularyProgress } from "../../services/local-visual-vocabulary-progress";
import { TutorVisualVocabularyCard } from "./VisualVocabulary";
const TARGET_LANGUAGE_COPY = {
    fi: { fi: "suomea", es: "espanjaa", en: "englantia" },
    es: { fi: "finés", es: "español", en: "inglés" },
    en: { fi: "Finnish", es: "Spanish", en: "English" },
};
const TARGET_LANGUAGE_GREETING = {
    fi: "Hei! Olen Elovion kieliopettaja. Mitä haluaisit harjoitella tänään?",
    es: "¡Hola! Soy tu tutor de idiomas de Elovio. ¿Qué te gustaría practicar hoy?",
    en: "Hello! I am your Elovio language tutor. What would you like to practise today?",
};
const COPY = {
    fi: {
        title: "Elovion AI-opettaja",
        intro: (language) => "Harjoittele " + language + " oikeissa tilanteissa omaan tahtiisi. Keskustelua ei tallenneta sovelluksen historiaan.",
        placeholder: "Kirjoita viestisi…",
        send: "Lähetä",
        back: "Takaisin",
        signIn: "Kirjaudu sisään käyttääksesi AI-opettajaa.",
        server: "AI-opettajan palvelimen osoite puuttuu. Mobiilisovellus tarvitsee EXPO_PUBLIC_API_BASE_URL-asetuksen.",
        loading: "Opettaja miettii…",
        failed: "Viestin lähettäminen epäonnistui. Yritä uudelleen.",
        configured: "AI-palvelua ei ole vielä otettu käyttöön. Yritä myöhemmin uudelleen.",
        limit: "Olet käyttänyt tämän hetken viestikiintiön. Odota hetki ja yritä uudelleen.",
    },
    es: {
        title: "Tutor de IA de Elovio",
        intro: (language) => "Practica " + language + " en situaciones reales y a tu ritmo. La conversación no se guarda en el historial de la aplicación.",
        placeholder: "Escribe tu mensaje…",
        send: "Enviar",
        back: "Volver",
        signIn: "Inicia sesión para usar el tutor de IA.",
        server: "Falta la dirección del servidor. La aplicación móvil necesita EXPO_PUBLIC_API_BASE_URL.",
        loading: "El tutor está pensando…",
        failed: "No se pudo enviar el mensaje. Inténtalo de nuevo.",
        configured: "El servicio de IA todavía no está configurado.",
        limit: "Has alcanzado el límite temporal. Espera un momento e inténtalo de nuevo.",
    },
    en: {
        title: "Elovio AI tutor",
        intro: (language) => "Practise " + language + " in real-world situations at your own pace. This conversation is not saved in app history.",
        placeholder: "Write your message…",
        send: "Send",
        back: "Back",
        signIn: "Sign in to use the AI tutor.",
        server: "The API server address is missing. The mobile app needs EXPO_PUBLIC_API_BASE_URL.",
        loading: "Your tutor is thinking…",
        failed: "The message could not be sent. Please try again.",
        configured: "The AI service has not been configured yet.",
        limit: "You have reached the temporary message limit. Wait a moment and try again.",
    },
};
export function TutorChat({ interfaceLanguage, nativeLanguage, learningLanguage, learnerLevel, onClose, }) {
    const uiLanguage = interfaceLanguage === "es" || interfaceLanguage === "en" ? interfaceLanguage : "fi";
    const copy = COPY[uiLanguage];
    const targetLanguage = learningLanguage === "fi" || learningLanguage === "en" ? learningLanguage : "es";
    const targetLanguageName = TARGET_LANGUAGE_COPY[uiLanguage][targetLanguage];
    const greeting = TARGET_LANGUAGE_GREETING[targetLanguage];
    const [messages, setMessages] = useState([]);
    const [draft, setDraft] = useState("");
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState("");
    async function sendMessage() {
        const content = draft.trim();
        if (!content || busy)
            return;
        if (!supabase) {
            setNotice(copy.signIn);
            return;
        }
        setBusy(true);
        setNotice("");
        try {
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !sessionData.session?.access_token) {
                setNotice(copy.signIn);
                return;
            }
            const localLearning = loadLocalLearningProgress();
            const visualLearning = loadVisualVocabularyProgress();
            const learningContext = {
                completedPhraseIds: localLearning.completedPhraseIds.slice(-30),
                duePhraseIds: getDuePhraseIds(localLearning).slice(0, 12),
                difficultPhraseIds: localLearning.reviewHistory.filter((item) => item.result === "again").slice(-8).map((item) => item.phraseId),
                masteredVisualEntryIds: visualLearning.masteredEntryIds.slice(0, 6),
            };
            const nextMessages = [...messages, { role: "user", content }].slice(-11).map(({ role, content }) => ({ role, content }));
            const configuredBase = import.meta.env.VITE_ELOVIO_API_BASE_URL?.trim().replace(/\/$/, "");
            const apiUrl = configuredBase
                ? configuredBase + "/api/ai/tutor"
                : Platform.OS === "web" ? "/api/ai/tutor" : "";
            if (!apiUrl) {
                setNotice(copy.server);
                return;
            }
            const response = await requestElovioApi(apiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer " + sessionData.session.access_token,
                },
                body: JSON.stringify({
                    interfaceLanguage,
                    nativeLanguage,
                    learningLanguage,
                    learnerLevel,
                    learningContext,
                    messages: nextMessages,
                }),
            });
            const result = await response.json();
            if (!response.ok || !result.reply) {
                if (response.status === 503 && result.error === "ai_provider_not_configured") {
                    setNotice(copy.configured);
                }
                else if (response.status === 429) {
                    setNotice(copy.limit);
                }
                else {
                    setNotice(copy.failed);
                }
                return;
            }
            setMessages([...nextMessages, { role: "assistant", content: result.reply, visualVocabularyId: result.visualVocabularyId ?? null }]);
            setDraft("");
        }
        catch {
            setNotice(copy.failed);
        }
        finally {
            setBusy(false);
        }
    }
    return (<SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.back}>
            <Text style={styles.backText}>‹ {copy.back}</Text>
          </Pressable>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.intro}>{copy.intro(targetLanguageName)}</Text>
        </View>
        <ScrollView contentContainerStyle={styles.messages} keyboardShouldPersistTaps="handled">
          {messages.length === 0 && (<View style={styles.assistantBubble}>
              <Text style={styles.messageText}>{greeting}</Text>
            </View>)}
          {messages.map((message, index) => (<View key={index} style={[styles.messageGroup, message.role === "user" && styles.userMessageGroup]}>
              <View style={[styles.bubble, message.role === "user" ? styles.userBubble : styles.assistantBubble]}>
                <Text style={styles.messageText}>{message.content}</Text>
              </View>
              {message.role === "assistant" && message.visualVocabularyId ? (<TutorVisualVocabularyCard entryId={message.visualVocabularyId} learningLanguage={learningLanguage} explanationLanguage={nativeLanguage}/>) : null}
            </View>))}
          {busy && (<View style={styles.loading}>
              <ActivityIndicator color="var(--elovio-source-1)"/>
              <Text style={styles.muted}>{copy.loading}</Text>
            </View>)}
        </ScrollView>
        {!!notice && <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text>}
        <View style={styles.composer}>
          <TextInput accessibilityLabel={copy.placeholder} editable={!busy} multiline maxLength={2000} onChangeText={setDraft} placeholder={copy.placeholder} placeholderTextColor="var(--elovio-source-2)" style={styles.input} value={draft}/>
          <Pressable accessibilityRole="button" disabled={busy || !draft.trim()} onPress={sendMessage} style={[styles.send, (busy || !draft.trim()) && styles.disabled]}>
            <Text style={styles.sendText}>{copy.send}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>);
}
const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: "var(--elovio-source-4)" },
    flex: { flex: 1 },
    header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14, gap: 8, borderBottomWidth: 1, borderBottomColor: "var(--elovio-source-8)" },
    back: { alignSelf: "flex-start", paddingVertical: 6 },
    backText: { color: "var(--elovio-source-1)", fontWeight: "700" },
    title: { color: "var(--elovio-source-6)", fontSize: 24, fontWeight: "700" },
    intro: { color: "var(--elovio-source-7)", fontSize: 13, lineHeight: 19 },
    messages: { flexGrow: 1, padding: 16, gap: 12, justifyContent: "flex-end" },
    messageGroup: { maxWidth: "92%", alignSelf: "flex-start", gap: 8 },
    userMessageGroup: { alignSelf: "flex-end" },
    bubble: { maxWidth: "100%", padding: 13, borderRadius: 16 },
    userBubble: { alignSelf: "flex-end", backgroundColor: "var(--elovio-source-88)", borderBottomRightRadius: 5 },
    assistantBubble: { alignSelf: "flex-start", backgroundColor: "var(--elovio-source-3)", borderWidth: 1, borderColor: "var(--elovio-source-8)", borderBottomLeftRadius: 5 },
    messageText: { color: "var(--elovio-source-12)", fontSize: 15, lineHeight: 22 },
    loading: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10 },
    muted: { color: "var(--elovio-source-5)", fontSize: 12 },
    notice: { color: "var(--elovio-source-89)", paddingHorizontal: 16, paddingBottom: 8, fontSize: 13 },
    composer: { flexDirection: "row", alignItems: "flex-end", gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: "var(--elovio-source-8)", backgroundColor: "var(--elovio-source-3)" },
    input: { flex: 1, maxHeight: 120, minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: "var(--elovio-source-9)", paddingHorizontal: 12, paddingVertical: 10, color: "var(--elovio-source-6)", backgroundColor: "var(--elovio-source-3)" },
    send: { minHeight: 46, paddingHorizontal: 16, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "var(--elovio-source-15)" },
    sendText: { color: "var(--elovio-source-3)", fontWeight: "700" },
    disabled: { opacity: 0.45 },
});
