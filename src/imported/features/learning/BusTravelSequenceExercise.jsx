import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { resolveContentLanguage } from "../../services/content-language";
import { BUS_TRAVEL_SEQUENCE } from "../../content/bus-travel-sequence";
import { createBusTravelSequenceRound, isNextBusTravelStep } from "../../services/bus-travel-sequence";
const COPY = {
    fi: { title: "Lähde bussimatkalle", intro: "Matkaan valmistautuminen sujuu helpommin, kun etenet vaihe vaiheelta. Järjestä kuvat oikeaan järjestykseen.", progress: "Oikein järjestetyt vaiheet", retry: "Ei aivan. Mieti, mitä pitää tehdä ennen seuraavaa vaihetta.", step: "Vaihe", complete: "Hienoa! Osaat valmistautua bussimatkaan.", restart: "Harjoittele uudelleen", source: "Elovion alkuperäiset piirrokset · Bussimatkalle valmistautuminen" },
    es: { title: "Prepárate para viajar en autobús", intro: "Preparar el viaje es más fácil paso a paso. Ordena las imágenes correctamente.", progress: "Pasos ordenados correctamente", retry: "No exactamente. Piensa qué hay que hacer antes del siguiente paso.", step: "Paso", complete: "¡Muy bien! Sabes cómo prepararte para viajar en autobús.", restart: "Practicar otra vez", source: "Ilustraciones originales de Elovio · Preparación del viaje en autobús" },
    en: { title: "Get ready for a bus trip", intro: "Getting ready is easier when you follow the steps. Put the pictures in the correct order.", progress: "Steps in the correct order", retry: "Not quite. Think about what needs to happen before the next step.", step: "Step", complete: "Well done! You know how to get ready for a bus trip.", restart: "Practise again", source: "Original Elovio illustrations · Preparing for a bus trip" },
};
function BusScene({ scene, label }) {
    return (<View accessible accessibilityLabel={label} style={styles.scene}>
      <View style={styles.skySun}/>
      <View style={styles.ground}/>
      {scene === 0 ? (<>
          <View style={styles.routeBoard}><Text style={styles.routeText}>A → B</Text><Text style={styles.routeSmall}>ROUTE</Text></View>
          <View style={styles.mapLine}/><View style={styles.mapPin}/>
        </>) : null}
      {scene === 1 ? (<>
          <View style={styles.ticket}><Text style={styles.ticketTitle}>BUS</Text><View style={styles.ticketLine}/><View style={styles.ticketLineShort}/><Text style={styles.ticketMark}>✓</Text></View>
          <View style={styles.ticketShadow}/>
        </>) : null}
      {scene === 2 ? (<>
          <View style={styles.stopPole}/><View style={styles.stopSign}><Text style={styles.stopLetter}>BUS</Text></View>
          <View style={styles.personHead}/><View style={styles.personBody}/><View style={styles.personLegOne}/><View style={styles.personLegTwo}/>
        </>) : null}
      {scene === 3 ? (<>
          <View style={styles.busBody}><View style={styles.busWindow}/><View style={styles.busDoor}/><View style={styles.busFront}/></View>
          <View style={styles.wheelLeft}/><View style={styles.wheelRight}/>
          <View style={styles.personHeadBoard}/><View style={styles.personBodyBoard}/>
        </>) : null}
    </View>);
}
export function BusTravelSequenceExercise({ interfaceLanguage, learningLanguage }) {
    const language = interfaceLanguage === "fi" ? "fi" : interfaceLanguage === "es" ? "es" : "en";
    const t = COPY[language];
    const contentLanguage = resolveContentLanguage(learningLanguage);
    const [round, setRound] = useState(() => createBusTravelSequenceRound());
    const [selectedIds, setSelectedIds] = useState([]);
    const [incorrect, setIncorrect] = useState(false);
    const complete = selectedIds.length === BUS_TRAVEL_SEQUENCE.length;
    const options = round.optionIds.map((id) => BUS_TRAVEL_SEQUENCE.find((step) => step.id === id)).filter((step) => Boolean(step));
    function choose(id) {
        if (complete || selectedIds.includes(id))
            return;
        if (!isNextBusTravelStep(id, selectedIds.length)) {
            setIncorrect(true);
            return;
        }
        setIncorrect(false);
        setSelectedIds((current) => [...current, id]);
    }
    return (<View style={styles.card}>
      <Text style={styles.title}>{t.title}</Text>
      <Text style={styles.body}>{t.intro}</Text>
      <Text style={styles.progress}>{t.progress}: {selectedIds.length} / {BUS_TRAVEL_SEQUENCE.length}</Text>
      <View style={styles.track}><View style={[styles.fill, { width: String(selectedIds.length / BUS_TRAVEL_SEQUENCE.length * 100) + "%" }]}/></View>
      {complete ? (<>
          <Text accessibilityRole="text" style={styles.success}>{t.complete}</Text>
          {BUS_TRAVEL_SEQUENCE.map((step) => <View key={step.id} style={styles.completedRow}><Text style={styles.number}>{step.order}</Text><View style={styles.copy}><Text style={styles.word}>{step.words[contentLanguage]}</Text><Text style={styles.body}>{step.description[contentLanguage]}</Text></View></View>)}
          <Pressable accessibilityRole="button" onPress={() => { setRound(createBusTravelSequenceRound()); setSelectedIds([]); setIncorrect(false); }} style={styles.button}><Text style={styles.buttonText}>{t.restart}</Text></Pressable>
        </>) : (<>
          <View style={styles.options}>
            {options.map((step) => {
                const selectedOrder = selectedIds.indexOf(step.id);
                return <Pressable key={step.id} accessibilityRole="button" accessibilityLabel={step.description[contentLanguage]} accessibilityState={{ selected: selectedOrder >= 0 }} disabled={selectedOrder >= 0} onPress={() => choose(step.id)} style={[styles.option, selectedOrder >= 0 && styles.selected]}>
                <BusScene scene={step.order - 1} label={step.description[contentLanguage]}/>
                {selectedOrder >= 0 ? <Text style={styles.selectedText}>{t.step} {selectedOrder + 1}: {step.words[contentLanguage]}</Text> : null}
              </Pressable>;
            })}
          </View>
          {incorrect ? <Text accessibilityRole="text" style={styles.error}>{t.retry}</Text> : null}
        </>)}
      <Text style={styles.attribution}>{t.source}</Text>
    </View>);
}
const styles = StyleSheet.create({
    card: { backgroundColor: "var(--elovio-source-3)", borderRadius: 22, padding: 18, gap: 14, borderWidth: 1, borderColor: "var(--elovio-source-18)" },
    title: { color: "var(--elovio-source-6)", fontSize: 24, fontWeight: "700" },
    body: { color: "var(--elovio-source-7)", fontSize: 13, lineHeight: 20 },
    progress: { color: "var(--elovio-source-1)", fontSize: 13, fontWeight: "700" },
    track: { height: 7, backgroundColor: "var(--elovio-source-19)", borderRadius: 8, overflow: "hidden" },
    fill: { height: "100%", backgroundColor: "var(--elovio-source-20)", borderRadius: 8 },
    options: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    option: { width: "48%", minHeight: 164, borderWidth: 1, borderColor: "var(--elovio-source-21)", borderRadius: 13, backgroundColor: "var(--elovio-source-22)", overflow: "hidden", padding: 6, justifyContent: "space-between" },
    selected: { borderColor: "var(--elovio-source-20)", backgroundColor: "var(--elovio-source-10)" },
    scene: { width: "100%", height: 132, borderRadius: 9, backgroundColor: "var(--elovio-source-23)", overflow: "hidden", alignItems: "center", justifyContent: "center" },
    skySun: { position: "absolute", top: 12, right: 15, width: 22, height: 22, borderRadius: 11, backgroundColor: "var(--elovio-source-24)" },
    ground: { position: "absolute", bottom: 0, width: "100%", height: 18, backgroundColor: "var(--elovio-source-25)" },
    routeBoard: { width: 112, height: 76, backgroundColor: "var(--elovio-source-26)", borderWidth: 3, borderColor: "var(--elovio-source-20)", borderRadius: 8, alignItems: "center", justifyContent: "center", gap: 4 },
    routeText: { color: "var(--elovio-source-27)", fontSize: 21, fontWeight: "800" },
    routeSmall: { color: "var(--elovio-source-5)", fontSize: 8, fontWeight: "700", letterSpacing: 1 },
    mapLine: { position: "absolute", width: 84, height: 4, backgroundColor: "var(--elovio-source-28)", transform: [{ rotate: "-25deg" }] },
    mapPin: { position: "absolute", top: 25, left: "28%", width: 15, height: 15, borderRadius: 8, backgroundColor: "var(--elovio-source-29)", borderWidth: 3, borderColor: "var(--elovio-source-26)" },
    ticket: { width: 128, height: 72, backgroundColor: "var(--elovio-source-26)", borderWidth: 2, borderColor: "var(--elovio-source-29)", borderRadius: 7, padding: 9, gap: 4, transform: [{ rotate: "-5deg" }] },
    ticketTitle: { color: "var(--elovio-source-27)", fontSize: 12, fontWeight: "800" },
    ticketLine: { width: "65%", height: 3, backgroundColor: "var(--elovio-source-30)" },
    ticketLineShort: { width: "42%", height: 3, backgroundColor: "var(--elovio-source-30)" },
    ticketMark: { position: "absolute", right: 10, bottom: 8, color: "var(--elovio-source-20)", fontSize: 22, fontWeight: "800" },
    ticketShadow: { position: "absolute", bottom: 20, width: 100, height: 4, backgroundColor: "var(--elovio-source-31)", borderRadius: 4 },
    stopPole: { position: "absolute", left: "32%", bottom: 18, width: 5, height: 90, backgroundColor: "var(--elovio-source-32)" },
    stopSign: { position: "absolute", left: "17%", top: 18, width: 42, height: 42, borderRadius: 21, backgroundColor: "var(--elovio-source-20)", borderWidth: 3, borderColor: "var(--elovio-source-3)", alignItems: "center", justifyContent: "center" },
    stopLetter: { color: "var(--elovio-source-3)", fontSize: 9, fontWeight: "800" },
    personHead: { position: "absolute", bottom: 88, right: "30%", width: 20, height: 20, borderRadius: 10, backgroundColor: "var(--elovio-source-33)" },
    personBody: { position: "absolute", bottom: 37, right: "27%", width: 28, height: 50, borderRadius: 10, backgroundColor: "var(--elovio-source-29)" },
    personLegOne: { position: "absolute", bottom: 17, right: "35%", width: 8, height: 24, backgroundColor: "var(--elovio-source-34)" },
    personLegTwo: { position: "absolute", bottom: 17, right: "25%", width: 8, height: 24, backgroundColor: "var(--elovio-source-34)" },
    busBody: { position: "absolute", bottom: 28, left: "10%", width: "75%", height: 70, borderRadius: 13, backgroundColor: "var(--elovio-source-35)", borderWidth: 3, borderColor: "var(--elovio-source-36)", flexDirection: "row", padding: 8, gap: 7 },
    busWindow: { width: "38%", height: 27, backgroundColor: "var(--elovio-source-37)", borderRadius: 4 },
    busDoor: { width: "22%", height: 51, backgroundColor: "var(--elovio-source-38)", borderWidth: 2, borderColor: "var(--elovio-source-36)" },
    busFront: { position: "absolute", right: -5, top: 30, width: 7, height: 12, backgroundColor: "var(--elovio-source-39)" },
    wheelLeft: { position: "absolute", bottom: 19, left: "23%", width: 26, height: 26, borderRadius: 13, backgroundColor: "var(--elovio-source-40)", borderWidth: 4, borderColor: "var(--elovio-source-41)" },
    wheelRight: { position: "absolute", bottom: 19, right: "23%", width: 26, height: 26, borderRadius: 13, backgroundColor: "var(--elovio-source-40)", borderWidth: 4, borderColor: "var(--elovio-source-41)" },
    personHeadBoard: { position: "absolute", bottom: 92, right: "12%", width: 17, height: 17, borderRadius: 9, backgroundColor: "var(--elovio-source-33)" },
    personBodyBoard: { position: "absolute", bottom: 55, right: "10%", width: 21, height: 37, borderRadius: 8, backgroundColor: "var(--elovio-source-29)" },
    selectedText: { color: "var(--elovio-source-1)", fontSize: 10, fontWeight: "700", textAlign: "center", paddingVertical: 3 },
    completedRow: { flexDirection: "row", gap: 10, padding: 10, backgroundColor: "var(--elovio-source-42)", borderRadius: 10 },
    number: { color: "var(--elovio-source-1)", fontSize: 16, fontWeight: "800", width: 20 },
    copy: { flex: 1, gap: 3 },
    word: { color: "var(--elovio-source-6)", fontSize: 14, fontWeight: "700" },
    button: { backgroundColor: "var(--elovio-source-27)", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
    buttonText: { color: "var(--elovio-source-3)", fontSize: 14, fontWeight: "700" },
    success: { color: "var(--elovio-source-43)", fontSize: 15, lineHeight: 22, fontWeight: "700" },
    error: { color: "var(--elovio-source-44)", fontSize: 13, fontWeight: "600" },
    attribution: { color: "var(--elovio-source-45)", fontSize: 11, lineHeight: 16 },
});
