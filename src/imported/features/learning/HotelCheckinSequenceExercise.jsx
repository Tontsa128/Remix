import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { resolveContentLanguage } from "../../services/content-language";
import { HOTEL_CHECKIN_SEQUENCE } from "../../content/hotel-checkin-sequence";
import { createHotelCheckinRound, isNextHotelCheckinStep } from "../../services/hotel-checkin-sequence";
const COPY = {
    fi: { title: "Kirjaudu hotelliin", intro: "Hotelliin saapuminen sujuu vaiheittain. Järjestä kuvat oikeaan järjestykseen.", progress: "Oikein järjestetyt vaiheet", retry: "Ei aivan. Mieti, mitä tapahtuu seuraavaksi.", step: "Vaihe", complete: "Hienoa! Osaat kirjautua hotelliin.", restart: "Harjoittele uudelleen", source: "Elovion alkuperäiset piirrokset · Hotelliin kirjautuminen" },
    es: { title: "Regístrate en el hotel", intro: "Llegar al hotel es sencillo paso a paso. Ordena las imágenes correctamente.", progress: "Pasos ordenados correctamente", retry: "No exactamente. Piensa qué sucede después.", step: "Paso", complete: "¡Muy bien! Sabes cómo registrarte en un hotel.", restart: "Practicar otra vez", source: "Ilustraciones originales de Elovio · Registro en el hotel" },
    en: { title: "Check in at a hotel", intro: "Checking in is easy when you follow the steps. Put the pictures in the correct order.", progress: "Steps in the correct order", retry: "Not quite. Think about what happens next.", step: "Step", complete: "Well done! You know how to check in at a hotel.", restart: "Practise again", source: "Original Elovio illustrations · Hotel check-in" }
};
function HotelScene({ scene, label }) {
    return <View accessible accessibilityLabel={label} style={styles.scene}>
  <View style={styles.wall}/><View style={styles.floor}/>
  {scene === 0 ? <><View style={styles.sign}><Text style={styles.signText}>HOTEL</Text></View><View style={styles.door}/></> : null}
  {scene === 1 ? <><View style={styles.counter}/><View style={styles.personHead}/><View style={styles.personBody}/><View style={styles.document}><Text style={styles.docText}>BOOKING</Text><Text style={styles.docCheck}>✓</Text></View></> : null}
  {scene === 2 ? <><View style={styles.hand}/><View style={styles.keyCard}><Text style={styles.keyText}>ROOM</Text><Text style={styles.keyNumber}>204</Text></View></> : null}
  {scene === 3 ? <><View style={styles.doorRoom}/><View style={styles.doorNumber}>204</View><View style={styles.suitcase}/><View style={styles.suitcaseHandle}/></> : null}
 </View>;
}
export function HotelCheckinSequenceExercise({ interfaceLanguage, learningLanguage }) {
    const language = interfaceLanguage === "fi" ? "fi" : interfaceLanguage === "es" ? "es" : "en";
    const t = COPY[language];
    const contentLanguage = resolveContentLanguage(learningLanguage);
    const [round, setRound] = useState(() => createHotelCheckinRound());
    const [selected, setSelected] = useState([]);
    const [incorrect, setIncorrect] = useState(false);
    const complete = selected.length === HOTEL_CHECKIN_SEQUENCE.length;
    const options = round.optionIds.map(id => HOTEL_CHECKIN_SEQUENCE.find(step => step.id === id)).filter((step) => Boolean(step));
    function restart() { setRound(createHotelCheckinRound()); setSelected([]); setIncorrect(false); }
    function choose(id) { if (complete || selected.includes(id))
        return; if (!isNextHotelCheckinStep(id, selected.length)) {
        setIncorrect(true);
        return;
    } setIncorrect(false); setSelected(current => [...current, id]); }
    return <View style={styles.card}>
  <Text style={styles.title}>{t.title}</Text><Text style={styles.body}>{t.intro}</Text>
  <Text style={styles.progress}>{t.progress}: {selected.length} / 4</Text>
  <View style={styles.track}><View style={[styles.fill, { width: String(selected.length * 25) + "%" }]}/></View>
  {complete ? <><Text accessibilityRole="text" style={styles.success}>{t.complete}</Text>{HOTEL_CHECKIN_SEQUENCE.map(step => <View key={step.id} style={styles.row}><Text style={styles.number}>{step.order}</Text><View style={styles.copy}><Text style={styles.word}>{step.words[contentLanguage]}</Text><Text style={styles.body}>{step.description[contentLanguage]}</Text></View></View>)}<Pressable accessibilityRole="button" onPress={restart} style={styles.button}><Text style={styles.buttonText}>{t.restart}</Text></Pressable></> : <>
   <View style={styles.options}>{options.map(step => { const position = selected.indexOf(step.id); return <Pressable key={step.id} accessibilityRole="button" accessibilityLabel={step.description[contentLanguage]} accessibilityState={{ selected: position >= 0 }} disabled={position >= 0} onPress={() => choose(step.id)} style={[styles.option, position >= 0 && styles.selected]}><HotelScene scene={step.order - 1} label={step.description[contentLanguage]}/>{position >= 0 ? <Text style={styles.selectedText}>{t.step} {position + 1}: {step.words[contentLanguage]}</Text> : null}</Pressable>; })}</View>
   {incorrect ? <Text accessibilityRole="text" style={styles.error}>{t.retry}</Text> : null}
  </>}
  <Text style={styles.attribution}>{t.source}</Text>
 </View>;
}
const styles = StyleSheet.create({
    card: { backgroundColor: "var(--elovio-source-3)", borderRadius: 22, padding: 18, gap: 14, borderWidth: 1, borderColor: "var(--elovio-source-18)" }, title: { color: "var(--elovio-source-6)", fontSize: 24, fontWeight: "700" }, body: { color: "var(--elovio-source-7)", fontSize: 13, lineHeight: 20 }, progress: { color: "var(--elovio-source-1)", fontSize: 13, fontWeight: "700" }, track: { height: 7, backgroundColor: "var(--elovio-source-19)", borderRadius: 8, overflow: "hidden" }, fill: { height: "100%", backgroundColor: "var(--elovio-source-20)", borderRadius: 8 }, options: { flexDirection: "row", flexWrap: "wrap", gap: 10 }, option: { width: "48%", minHeight: 164, borderWidth: 1, borderColor: "var(--elovio-source-21)", borderRadius: 13, backgroundColor: "var(--elovio-source-22)", overflow: "hidden", padding: 6, justifyContent: "space-between" }, selected: { borderColor: "var(--elovio-source-20)", backgroundColor: "var(--elovio-source-10)" }, scene: { width: "100%", height: 132, borderRadius: 9, backgroundColor: "var(--elovio-source-64)", overflow: "hidden", alignItems: "center", justifyContent: "center" }, wall: { position: "absolute", top: 0, width: "100%", height: "82%", backgroundColor: "var(--elovio-source-65)" }, floor: { position: "absolute", bottom: 0, width: "100%", height: "18%", backgroundColor: "var(--elovio-source-66)" }, sign: { width: 110, height: 48, backgroundColor: "var(--elovio-source-1)", alignItems: "center", justifyContent: "center", borderRadius: 5 }, signText: { color: "var(--elovio-source-3)", fontWeight: "800", fontSize: 16, letterSpacing: 2 }, door: { position: "absolute", bottom: 17, right: 24, width: 40, height: 76, backgroundColor: "var(--elovio-source-67)", borderWidth: 3, borderColor: "var(--elovio-source-3)" }, counter: { position: "absolute", bottom: 25, width: "90%", height: 22, backgroundColor: "var(--elovio-source-83)", borderRadius: 4 }, personHead: { position: "absolute", bottom: 67, left: 30, width: 22, height: 22, borderRadius: 11, backgroundColor: "var(--elovio-source-33)" }, personBody: { position: "absolute", bottom: 24, left: 26, width: 30, height: 45, backgroundColor: "var(--elovio-source-20)", borderRadius: 8 }, document: { position: "absolute", right: 28, top: 24, width: 64, height: 82, backgroundColor: "var(--elovio-source-3)", padding: 7, borderWidth: 2, borderColor: "var(--elovio-source-84)", gap: 8 }, docText: { fontSize: 8, fontWeight: "800", color: "var(--elovio-source-1)" }, docCheck: { fontSize: 25, color: "var(--elovio-source-20)", fontWeight: "800" }, hand: { position: "absolute", left: 40, bottom: 35, width: 60, height: 14, backgroundColor: "var(--elovio-source-33)", borderRadius: 8, transform: [{ rotate: "-12deg" }] }, keyCard: { width: 74, height: 88, backgroundColor: "var(--elovio-source-20)", borderRadius: 8, alignItems: "center", justifyContent: "center", gap: 8 }, keyText: { color: "var(--elovio-source-3)", fontSize: 9, fontWeight: "800" }, keyNumber: { color: "var(--elovio-source-3)", fontSize: 23, fontWeight: "800" }, doorRoom: { position: "absolute", bottom: 16, width: 74, height: 104, backgroundColor: "var(--elovio-source-67)", borderWidth: 4, borderColor: "var(--elovio-source-3)" }, doorNumber: { position: "absolute", top: 20, color: "var(--elovio-source-1)", fontSize: 17, fontWeight: "800" }, suitcase: { position: "absolute", bottom: 17, right: 28, width: 44, height: 48, backgroundColor: "var(--elovio-source-29)", borderRadius: 6, borderWidth: 3, borderColor: "var(--elovio-source-3)" }, suitcaseHandle: { position: "absolute", bottom: 63, right: 40, width: 20, height: 10, borderWidth: 3, borderColor: "var(--elovio-source-29)", borderBottomWidth: 0 }, selectedText: { color: "var(--elovio-source-1)", fontWeight: "700", fontSize: 11, padding: 3 }, success: { color: "var(--elovio-source-1)", fontSize: 16, fontWeight: "700" }, row: { flexDirection: "row", gap: 10, alignItems: "center" }, number: { backgroundColor: "var(--elovio-source-80)", color: "var(--elovio-source-1)", fontWeight: "800", padding: 10, borderRadius: 10 }, copy: { flex: 1 }, word: { color: "var(--elovio-source-6)", fontWeight: "700" }, button: { backgroundColor: "var(--elovio-source-1)", padding: 13, borderRadius: 12, alignItems: "center" }, buttonText: { color: "var(--elovio-source-3)", fontWeight: "700" }, error: { color: "var(--elovio-source-81)", fontWeight: "600" }, attribution: { color: "var(--elovio-source-82)", fontSize: 10 }
});
