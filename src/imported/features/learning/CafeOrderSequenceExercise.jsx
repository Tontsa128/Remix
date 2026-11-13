import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { resolveContentLanguage } from "../../services/content-language";
import { CAFE_ORDER_SEQUENCE } from "../../content/cafe-order-sequence";
import { createCafeOrderRound, isNextCafeOrderStep } from "../../services/cafe-order-sequence";
const COPY = {
    fi: { title: "Tilaa kahvilassa", intro: "Kahvilassa asiointi on helppoa, kun etenet vaiheittain. Järjestä kuvat oikeaan järjestykseen.", progress: "Oikein järjestetyt vaiheet", retry: "Ei aivan. Mieti, mitä tapahtuu seuraavaksi.", step: "Vaihe", complete: "Hienoa! Osaat asioida kahvilassa.", restart: "Harjoittele uudelleen", source: "Elovion alkuperäiset piirrokset · Kahvilassa asiointi" },
    es: { title: "Pide en una cafetería", intro: "Pedir en una cafetería es fácil paso a paso. Ordena las imágenes correctamente.", progress: "Pasos ordenados correctamente", retry: "No exactamente. Piensa qué sucede después.", step: "Paso", complete: "¡Muy bien! Sabes pedir en una cafetería.", restart: "Practicar otra vez", source: "Ilustraciones originales de Elovio · Pedir en una cafetería" },
    en: { title: "Order at a café", intro: "Ordering at a café is easy when you follow the steps. Put the pictures in the correct order.", progress: "Steps in the correct order", retry: "Not quite. Think about what happens next.", step: "Step", complete: "Well done! You know how to order at a café.", restart: "Practise again", source: "Original Elovio illustrations · Ordering at a café" },
};
function CafeScene({ scene, label }) {
    return <View accessible accessibilityLabel={label} style={styles.scene}>
    <View style={styles.wallLight}/><View style={styles.counter}/>
    {scene === 0 ? <View style={styles.menuBoard}><Text style={styles.menuTitle}>MENU</Text><View style={styles.menuLine}/><View style={styles.menuLine}/><View style={styles.menuLineShort}/><View style={styles.menuCup}><View style={styles.menuCupCoffee}/><View style={styles.menuCupHandle}/></View></View> : null}
    {scene === 1 ? <><View style={styles.personHead}/><View style={styles.personBody}/><View style={styles.speech}><Text style={styles.speechText}>Hello!</Text></View><View style={styles.orderCup}/></> : null}
    {scene === 2 ? <><View style={styles.terminal}><View style={styles.terminalScreen}><Text style={styles.check}>✓</Text></View><View style={styles.terminalBase}/></View><View style={styles.cardPayment}/></> : null}
    {scene === 3 ? <><View style={styles.pickupShelf}/><View style={styles.cupHandle}/><View style={styles.cup}><View style={styles.coffee}/></View><View style={styles.steam}/><View style={styles.pickupBell}/></> : null}
  </View>;
}
export function CafeOrderSequenceExercise({ interfaceLanguage, learningLanguage }) {
    const language = interfaceLanguage === "fi" ? "fi" : interfaceLanguage === "es" ? "es" : "en";
    const t = COPY[language];
    const contentLanguage = resolveContentLanguage(learningLanguage);
    const [round, setRound] = useState(() => createCafeOrderRound());
    const [selectedIds, setSelectedIds] = useState([]);
    const [incorrect, setIncorrect] = useState(false);
    const complete = selectedIds.length === CAFE_ORDER_SEQUENCE.length;
    const options = round.optionIds.map((id) => CAFE_ORDER_SEQUENCE.find((step) => step.id === id)).filter((step) => Boolean(step));
    function choose(id) {
        if (complete || selectedIds.includes(id))
            return;
        if (!isNextCafeOrderStep(id, selectedIds.length)) {
            setIncorrect(true);
            return;
        }
        setIncorrect(false);
        setSelectedIds((current) => [...current, id]);
    }
    function restart() { setRound(createCafeOrderRound()); setSelectedIds([]); setIncorrect(false); }
    return <View style={styles.card}>
    <Text style={styles.title}>{t.title}</Text><Text style={styles.body}>{t.intro}</Text>
    <Text style={styles.progress}>{t.progress}: {selectedIds.length} / {CAFE_ORDER_SEQUENCE.length}</Text>
    <View style={styles.track}><View style={[styles.fill, { width: String(selectedIds.length / CAFE_ORDER_SEQUENCE.length * 100) + "%" }]}/></View>
    {complete ? <>
      <Text accessibilityRole="text" style={styles.success}>{t.complete}</Text>
      {CAFE_ORDER_SEQUENCE.map((step) => <View key={step.id} style={styles.completedRow}><Text style={styles.number}>{step.order}</Text><View style={styles.copy}><Text style={styles.word}>{step.words[contentLanguage]}</Text><Text style={styles.body}>{step.description[contentLanguage]}</Text></View></View>)}
      <Pressable accessibilityRole="button" onPress={restart} style={styles.button}><Text style={styles.buttonText}>{t.restart}</Text></Pressable>
    </> : <>
      <View style={styles.options}>{options.map((step) => {
                const selectedOrder = selectedIds.indexOf(step.id);
                return <Pressable key={step.id} accessibilityRole="button" accessibilityLabel={step.description[contentLanguage]} accessibilityState={{ selected: selectedOrder >= 0 }} disabled={selectedOrder >= 0} onPress={() => choose(step.id)} style={[styles.option, selectedOrder >= 0 && styles.selected]}>
          <CafeScene scene={step.order - 1} label={step.description[contentLanguage]}/>
          {selectedOrder >= 0 ? <Text style={styles.selectedText}>{t.step} {selectedOrder + 1}: {step.words[contentLanguage]}</Text> : null}
        </Pressable>;
            })}</View>
      {incorrect ? <Text accessibilityRole="text" style={styles.error}>{t.retry}</Text> : null}
    </>}
    <Text style={styles.attribution}>{t.source}</Text>
  </View>;
}
const styles = StyleSheet.create({
    card: { backgroundColor: "var(--elovio-source-3)", borderRadius: 22, padding: 18, gap: 14, borderWidth: 1, borderColor: "var(--elovio-source-18)" },
    title: { color: "var(--elovio-source-6)", fontSize: 24, fontWeight: "700" }, body: { color: "var(--elovio-source-7)", fontSize: 13, lineHeight: 20 },
    progress: { color: "var(--elovio-source-1)", fontSize: 13, fontWeight: "700" }, track: { height: 7, backgroundColor: "var(--elovio-source-19)", borderRadius: 8, overflow: "hidden" }, fill: { height: "100%", backgroundColor: "var(--elovio-source-20)", borderRadius: 8 },
    options: { flexDirection: "row", flexWrap: "wrap", gap: 10 }, option: { width: "48%", minHeight: 164, borderWidth: 1, borderColor: "var(--elovio-source-21)", borderRadius: 13, backgroundColor: "var(--elovio-source-22)", overflow: "hidden", padding: 6, justifyContent: "space-between" }, selected: { borderColor: "var(--elovio-source-20)", backgroundColor: "var(--elovio-source-10)" },
    scene: { width: "100%", height: 132, borderRadius: 9, backgroundColor: "var(--elovio-source-49)", overflow: "hidden", alignItems: "center", justifyContent: "center" },
    wallLight: { position: "absolute", top: 0, width: "100%", height: "62%", backgroundColor: "var(--elovio-source-50)" }, counter: { position: "absolute", bottom: 0, width: "100%", height: 25, backgroundColor: "var(--elovio-source-51)" },
    menuBoard: { width: 92, height: 112, backgroundColor: "var(--elovio-source-1)", borderRadius: 6, padding: 9, gap: 7, alignItems: "center" }, menuTitle: { color: "var(--elovio-source-52)", fontSize: 13, fontWeight: "800", letterSpacing: 2 }, menuLine: { width: "80%", height: 3, backgroundColor: "var(--elovio-source-53)" }, menuLineShort: { width: "55%", height: 3, backgroundColor: "var(--elovio-source-53)" }, menuCup: { width: 23, height: 17, backgroundColor: "var(--elovio-source-52)", borderBottomLeftRadius: 5, borderBottomRightRadius: 5, alignItems: "center", marginTop: 1 }, menuCupCoffee: { width: 17, height: 4, backgroundColor: "var(--elovio-source-54)", borderRadius: 3 }, menuCupHandle: { position: "absolute", right: -6, top: 3, width: 9, height: 9, borderWidth: 2, borderColor: "var(--elovio-source-52)", borderRadius: 7 },
    personHead: { position: "absolute", top: 26, left: "25%", width: 30, height: 30, borderRadius: 15, backgroundColor: "var(--elovio-source-55)" }, personBody: { position: "absolute", bottom: 25, left: "22%", width: 42, height: 52, borderRadius: 12, backgroundColor: "var(--elovio-source-56)" }, speech: { position: "absolute", top: 19, right: "13%", width: 74, height: 35, borderRadius: 12, backgroundColor: "var(--elovio-source-3)", alignItems: "center", justifyContent: "center" }, speechText: { fontSize: 10, color: "var(--elovio-source-1)", fontWeight: "700" }, orderCup: { position: "absolute", bottom: 25, right: "20%", width: 29, height: 26, borderRadius: 4, backgroundColor: "var(--elovio-source-52)", borderBottomWidth: 5, borderColor: "var(--elovio-source-51)" },
    terminal: { position: "absolute", width: 70, height: 82, top: 22, alignItems: "center" }, terminalScreen: { width: 65, height: 57, backgroundColor: "var(--elovio-source-1)", borderRadius: 8, alignItems: "center", justifyContent: "center" }, check: { fontSize: 28, color: "var(--elovio-source-3)", fontWeight: "800" }, terminalBase: { width: 75, height: 9, backgroundColor: "var(--elovio-source-57)", borderRadius: 4 }, cardPayment: { position: "absolute", bottom: 30, right: "19%", width: 44, height: 30, borderRadius: 5, backgroundColor: "var(--elovio-source-58)", transform: [{ rotate: "-12deg" }] },
    pickupShelf: { position: "absolute", top: 50, width: "100%", height: 12, backgroundColor: "var(--elovio-source-59)" }, cup: { position: "absolute", top: 61, width: 43, height: 39, backgroundColor: "var(--elovio-source-52)", borderBottomLeftRadius: 9, borderBottomRightRadius: 9, alignItems: "center" }, coffee: { width: 35, height: 7, backgroundColor: "var(--elovio-source-54)", borderRadius: 5 }, cupHandle: { position: "absolute", top: 69, left: "58%", width: 17, height: 20, borderWidth: 4, borderColor: "var(--elovio-source-52)", borderRadius: 12 }, steam: { position: "absolute", top: 32, width: 4, height: 19, borderRadius: 3, backgroundColor: "var(--elovio-source-60)" }, pickupBell: { position: "absolute", top: 38, right: "16%", width: 20, height: 13, borderTopLeftRadius: 12, borderTopRightRadius: 12, backgroundColor: "var(--elovio-source-61)" },
    selectedText: { color: "var(--elovio-source-1)", fontSize: 11, fontWeight: "700", padding: 4 }, error: { color: "var(--elovio-source-62)", fontSize: 13, fontWeight: "600" }, success: { color: "var(--elovio-source-1)", fontSize: 16, fontWeight: "700" }, completedRow: { flexDirection: "row", gap: 12, alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "var(--elovio-source-18)" }, number: { width: 28, height: 28, textAlign: "center", textAlignVertical: "center", borderRadius: 14, overflow: "hidden", backgroundColor: "var(--elovio-source-10)", color: "var(--elovio-source-1)", fontWeight: "800" }, copy: { flex: 1, gap: 3 }, word: { color: "var(--elovio-source-6)", fontWeight: "700" }, button: { padding: 13, backgroundColor: "var(--elovio-source-1)", borderRadius: 12, alignItems: "center" }, buttonText: { color: "var(--elovio-source-3)", fontWeight: "700" }, attribution: { color: "var(--elovio-source-63)", fontSize: 10, lineHeight: 15 },
});
