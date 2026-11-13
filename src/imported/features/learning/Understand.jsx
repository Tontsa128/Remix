import { useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { requestElovioApi } from '../../services/api-client';
const COPY = {
  fi: { title: 'Ymmärrä arjen tekstejä', text: 'Teksti tai kysymys', image: 'Valitse kuva', remove: 'Poista kuva', send: 'Käännä ja selitä', back: 'Takaisin', busy: 'Tulkitaan…', error: 'Kieliapuri ei ole vielä käytettävissä. Palvelun avain puuttuu tai yhteys epäonnistui.', invalid: 'Valitse JPG-, PNG- tai WebP-kuva (enintään 2 Mt).', permission: 'Kirjaudu sisään käyttääksesi kieliapuria.' },
  es: { title: 'Entiende textos cotidianos', text: 'Texto o pregunta', image: 'Elegir imagen', remove: 'Quitar imagen', send: 'Traducir y explicar', back: 'Volver', busy: 'Interpretando…', error: 'El asistente no está disponible. Falta configurar el servicio o ha fallado la conexión.', invalid: 'Elige una imagen JPG, PNG o WebP (máximo 2 MB).', permission: 'Inicia sesión para usar el asistente.' },
  en: { title: 'Understand everyday texts', text: 'Text or question', image: 'Choose image', remove: 'Remove image', send: 'Translate and explain', back: 'Back', busy: 'Interpreting…', error: 'The assistant is unavailable. The service key is missing or the connection failed.', invalid: 'Choose a JPG, PNG or WebP image (maximum 2 MB).', permission: 'Sign in to use the assistant.' },
};
export function Understand({ interfaceLanguage, nativeLanguage, user, onClose }) {
  const t = COPY[interfaceLanguage] || COPY.fi;
  const [text, setText] = useState('');
  const [image, setImage] = useState('');
  const [reply, setReply] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  async function chooseImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 2_000_000) { setNotice(t.invalid); return; }
    const reader = new FileReader();
    reader.onload = () => { setImage(String(reader.result)); setReply(''); setNotice(''); };
    reader.onerror = () => setNotice(t.invalid);
    reader.readAsDataURL(file);
    event.target.value = '';
  }
  async function submit() {
    if (!user) { setNotice(t.permission); return; }
    setBusy(true); setNotice(''); setReply('');
    try {
      const response = await requestElovioApi('/api/ai/understand', { body: JSON.stringify({ text, image: image || undefined, language: nativeLanguage }) });
      const result = await response.json();
      if (!response.ok || !result.reply) setNotice(t.error);
      else setReply(result.reply);
    } catch { setNotice(t.error); }
    finally { setBusy(false); }
  }
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content}>
    <Pressable accessibilityRole="button" onPress={onClose}><Text style={styles.link}>‹ {t.back}</Text></Pressable>
    <Text style={styles.heading}>{t.title}</Text>
    <TextInput accessibilityLabel={t.text} placeholder={t.text} value={text} onChangeText={setText} editable={!busy} maxLength={4000} multiline style={styles.input}/>
    <label className="elovio-file-label">{t.image}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseImage} disabled={busy}/></label>
    {image && <><img className="elovio-document-image" src={image} alt={t.image}/><Pressable accessibilityRole="button" onPress={() => setImage('')}><Text style={styles.link}>{t.remove}</Text></Pressable></>}
    <Pressable accessibilityRole="button" disabled={busy || (!text.trim() && !image)} onPress={submit} style={[styles.action, (busy || (!text.trim() && !image)) && styles.disabled]}><Text style={styles.actionText}>{busy ? t.busy : t.send}</Text></Pressable>
    {notice && <Text accessibilityRole="alert" style={styles.body}>{notice}</Text>}
    {reply && <View style={styles.result}><Text accessibilityLiveRegion="polite" style={styles.body}>{reply}</Text></View>}
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'var(--background)' }, content: { padding: 24, gap: 18 },
  heading: { color: 'var(--foreground)', fontSize: 28, fontWeight: '700' },
  link: { color: 'var(--primary)', fontWeight: '700', paddingVertical: 8 },
  input: { minHeight: 150, borderWidth: 1, borderColor: 'var(--border)', borderRadius: 8, padding: 14, backgroundColor: 'var(--card)', color: 'var(--foreground)' },
  action: { minHeight: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--primary)' },
  actionText: { color: 'var(--primary-foreground)', fontWeight: '700' }, disabled: { opacity: 0.45 },
  body: { color: 'var(--foreground)', fontSize: 15, lineHeight: 23 }, result: { padding: 18, borderWidth: 1, borderColor: 'var(--border)', backgroundColor: 'var(--card)', borderRadius: 8 },
});