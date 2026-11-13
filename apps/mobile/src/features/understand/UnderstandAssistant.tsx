import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { LanguageCode } from "../../config/languages";
import { supabase } from "../../lib/supabase";

type Props = {
  interfaceLanguage: LanguageCode;
  explanationLanguage: LanguageCode;
  onClose: () => void;
};

const COPY = {
  fi: {
    title: "Ymmärrä arjen tekstejä",
    intro: "Liitä viesti, ruokalista, kyltti tai muu teksti. Elovio kääntää ja selittää sen valitsemallasi kielellä.",
    placeholder: "Liitä tai kirjoita teksti tähän…",
    action: "Käännä ja selitä",
    back: "Takaisin",
    signIn: "Kirjaudu sisään käyttääksesi kieliapuria.",
    missing: "Mobiilisovelluksen API-osoite puuttuu. Aseta EXPO_PUBLIC_API_BASE_URL.",
    empty: "Kirjoita ensin teksti.",
    busy: "Selitetään…",
    error: "Tekstiä ei voitu käsitellä. Tarkista yhteys ja palvelun asetukset.",
    notConfigured: "AI-palvelua ei ole vielä määritetty.",
    limit: "Käyttöraja tuli vastaan. Odota hetki ja yritä uudelleen.",
    imageNote: "Kuvien ja kameran tekstintunnistus ei ole vielä käytössä mobiilisovelluksessa. Voit liittää kuvan tekstin tähän.",
    result: "Selitys ja käännös",
  },
  es: {
    title: "Entiende textos cotidianos",
    intro: "Pega un mensaje, menú, cartel u otro texto. Elovio lo traduce y explica en el idioma que elijas.",
    placeholder: "Pega o escribe el texto aquí…",
    action: "Traducir y explicar",
    back: "Volver",
    signIn: "Inicia sesión para usar el asistente.",
    missing: "Falta la dirección de la API. Configura EXPO_PUBLIC_API_BASE_URL.",
    empty: "Escribe primero un texto.",
    busy: "Preparando la explicación…",
    error: "No se pudo procesar el texto. Comprueba la conexión y la configuración del servicio.",
    notConfigured: "El servicio de IA todavía no está configurado.",
    limit: "Has alcanzado el límite de uso. Espera un momento e inténtalo de nuevo.",
    imageNote: "El reconocimiento de texto en imágenes y cámara aún no está disponible en la aplicación móvil. Puedes pegar aquí el texto de la imagen.",
    result: "Traducción y explicación",
  },
  en: {
    title: "Understand everyday texts",
    intro: "Paste a message, menu, sign or other text. Elovio translates and explains it in your chosen language.",
    placeholder: "Paste or type text here…",
    action: "Translate and explain",
    back: "Back",
    signIn: "Sign in to use the assistant.",
    missing: "The API address is missing. Configure EXPO_PUBLIC_API_BASE_URL.",
    empty: "Enter some text first.",
    busy: "Preparing explanation…",
    error: "The text could not be processed. Check the connection and service configuration.",
    notConfigured: "The AI service has not been configured yet.",
    limit: "You have reached the usage limit. Wait a moment and try again.",
    imageNote: "Image and camera text recognition is not available in the mobile app yet. You can paste the text from an image here.",
    result: "Translation and explanation",
  },
} as const;

export function UnderstandAssistant({ interfaceLanguage, explanationLanguage, onClose }: Props) {
  const ui = interfaceLanguage === "es" || interfaceLanguage === "en" ? interfaceLanguage : "fi";
  const t = COPY[ui];
  const targetLanguage = explanationLanguage === "fi" || explanationLanguage === "es" ? explanationLanguage : "en";
  const [text, setText] = useState("");
  const [reply, setReply] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const content = text.trim();
    if (!content || busy) {
      if (!content) setNotice(t.empty);
      return;
    }
    if (!supabase) {
      setNotice(t.signIn);
      return;
    }
    setBusy(true);
    setNotice("");
    setReply("");
    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (sessionError || !token) {
        setNotice(t.signIn);
        return;
      }
      const base = (process.env.EXPO_PUBLIC_API_BASE_URL ?? "").trim().replace(/\/$/, "");
      const endpoint = base ? base + "/api/ai/understand" : typeof window !== "undefined" ? "/api/ai/understand" : "";
      if (!endpoint) {
        setNotice(t.missing);
        return;
      }
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({ text: content, language: targetLanguage }),
      });
      const payload = await response.json() as { reply?: unknown; error?: unknown };
      if (!response.ok || typeof payload.reply !== "string" || !payload.reply.trim()) {
        if (response.status === 429) setNotice(t.limit);
        else if (response.status === 503) setNotice(t.notConfigured);
        else setNotice(t.error);
        return;
      }
      setReply(payload.reply);
    } catch {
      setNotice(t.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.back}>
          <Text style={styles.backText}>‹ {t.back}</Text>
        </Pressable>
        <Text style={styles.title}>{t.title}</Text>
        <Text style={styles.body}>{t.intro}</Text>
        <TextInput
          accessibilityLabel={t.placeholder}
          multiline
          maxLength={4000}
          editable={!busy}
          value={text}
          onChangeText={(value) => { setText(value); setReply(""); setNotice(""); }}
          placeholder={t.placeholder}
          placeholderTextColor="#89958C"
          style={styles.input}
          textAlignVertical="top"
        />
        <Text style={styles.note}>{t.imageNote}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: busy || !text.trim() }}
          disabled={busy || !text.trim()}
          onPress={() => void submit()}
          style={[styles.action, (busy || !text.trim()) && styles.disabled]}
        >
          {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.actionText}>{t.action}</Text>}
        </Pressable>
        {!!notice && <Text accessibilityRole="alert" style={styles.error}>{notice}</Text>}
        {!!reply && (
          <View style={styles.result}>
            <Text style={styles.resultTitle}>{t.result}</Text>
            <Text accessibilityLiveRegion="polite" style={styles.body}>{reply}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F6F1" },
  content: { padding: 24, paddingBottom: 48, gap: 16 },
  back: { alignSelf: "flex-start", paddingVertical: 6 },
  backText: { color: "#315D4C", fontWeight: "700", fontSize: 14 },
  title: { color: "#183D32", fontSize: 27, fontWeight: "700" },
  body: { color: "#52645B", fontSize: 14, lineHeight: 22 },
  input: { minHeight: 180, borderWidth: 1, borderColor: "#D8DED7", borderRadius: 12, padding: 14, color: "#183D32", backgroundColor: "#FFFFFF", fontSize: 15, lineHeight: 22 },
  note: { color: "#7A877F", fontSize: 12, lineHeight: 18 },
  action: { minHeight: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#244E3E", paddingHorizontal: 16 },
  actionText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  disabled: { opacity: 0.45 },
  error: { color: "#A54A3F", fontSize: 13, lineHeight: 19 },
  result: { gap: 10, padding: 16, borderRadius: 14, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E7E9E2" },
  resultTitle: { color: "#183D32", fontSize: 16, fontWeight: "700" },
});
