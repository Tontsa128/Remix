import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { GROCERY_SHOPPING_SEQUENCE } from "../../content/grocery-shopping-sequence";
import { resolveContentLanguage } from "../../services/content-language";
import { createGroceryShoppingRound, isNextGroceryShoppingStep } from "../../services/grocery-shopping-sequence";
const COPY = {
    fi: {
        title: "Ruokaostoksilla",
        intro: "Käy kaupassa vaihe vaiheelta. Valitse kuvat siinä järjestyksessä, jossa ostokset tavallisesti etenevät.",
        progress: "Oikein järjestetyt vaiheet",
        retry: "Ei aivan. Mieti, mitä teet seuraavaksi kaupassa.",
        step: "Vaihe",
        complete: "Hienoa! Osaat hoitaa tavalliset ruokaostokset.",
        restart: "Harjoittele uudelleen",
        source: "Elovion alkuperäiset piirrokset · Ruokaostokset",
    },
    es: {
        title: "Hacer la compra",
        intro: "Haz la compra paso a paso. Elige las imágenes en el orden habitual.",
        progress: "Pasos ordenados correctamente",
        retry: "No exactamente. Piensa qué haces después en la tienda.",
        step: "Paso",
        complete: "¡Muy bien! Ya sabes hacer la compra.",
        restart: "Practicar otra vez",
        source: "Ilustraciones originales de Elovio · Hacer la compra",
    },
    en: {
        title: "Grocery shopping",
        intro: "Go shopping step by step. Choose the pictures in the order people usually shop.",
        progress: "Steps in the correct order",
        retry: "Not quite. Think about what you do next in the shop.",
        step: "Step",
        complete: "Well done! You know how to do the grocery shopping.",
        restart: "Practise again",
        source: "Original Elovio illustrations · Grocery shopping",
    },
};
function GroceryScene({ scene, label }) {
    return (<View accessible accessibilityLabel={label} style={styles.scene}>
      <View style={styles.wall}/>
      <View style={styles.floor}/>
      {scene === 0 ? (<>
          <View style={styles.basketHandle}/>
          <View style={styles.basket}><View style={styles.basketLineOne}/><View style={styles.basketLineTwo}/></View>
        </>) : null}
      {scene === 1 ? (<>
          <View style={styles.shelf}/>
          <View style={[styles.produce, styles.apple]}/>
          <View style={[styles.produce, styles.orange]}/>
          <View style={[styles.produce, styles.pear]}/>
          <View style={styles.shelfLower}/>
        </>) : null}
      {scene === 2 ? (<>
          <View style={styles.checkout}/>
          <View style={styles.cardTerminal}><View style={styles.terminalScreen}/></View>
          <View style={styles.bankCard}/>
          <View style={styles.checkoutBelt}/>
        </>) : null}
      {scene === 3 ? (<>
          <View style={styles.bagBody}/>
          <View style={styles.bagHandle}/>
          <View style={[styles.produce, styles.bagApple]}/>
          <View style={[styles.produce, styles.bagOrange]}/>
          <View style={styles.bagBread}/>
        </>) : null}
    </View>);
}
export function GroceryShoppingSequenceExercise({ interfaceLanguage, learningLanguage, }) {
    const language = interfaceLanguage === "fi" ? "fi" : interfaceLanguage === "es" ? "es" : "en";
    const t = COPY[language];
    const contentLanguage = resolveContentLanguage(learningLanguage);
    const [round, setRound] = useState(() => createGroceryShoppingRound());
    const [selected, setSelected] = useState([]);
    const [incorrect, setIncorrect] = useState(false);
    const complete = selected.length === GROCERY_SHOPPING_SEQUENCE.length;
    const options = round.optionIds
        .map((id) => GROCERY_SHOPPING_SEQUENCE.find((step) => step.id === id))
        .filter((step) => Boolean(step));
    function restart() {
        setRound(createGroceryShoppingRound());
        setSelected([]);
        setIncorrect(false);
    }
    function choose(id) {
        if (complete || selected.includes(id))
            return;
        if (!isNextGroceryShoppingStep(id, selected.length)) {
            setIncorrect(true);
            return;
        }
        setIncorrect(false);
        setSelected((current) => [...current, id]);
    }
    return (<View style={styles.card}>
      <Text style={styles.title}>{t.title}</Text>
      <Text style={styles.body}>{t.intro}</Text>
      <Text style={styles.progress}>{t.progress}: {selected.length} / 4</Text>
      <View style={styles.track}><View style={[styles.fill, { width: `${selected.length * 25}%` }]}/></View>
      {complete ? (<>
          <Text accessibilityRole="text" style={styles.success}>{t.complete}</Text>
          {GROCERY_SHOPPING_SEQUENCE.map((step) => (<View key={step.id} style={styles.row}>
              <Text style={styles.number}>{step.order}</Text>
              <View style={styles.copy}>
                <Text style={styles.word}>{step.words[contentLanguage]}</Text>
                <Text style={styles.body}>{step.description[contentLanguage]}</Text>
              </View>
            </View>))}
          <Pressable accessibilityRole="button" onPress={restart} style={styles.button}>
            <Text style={styles.buttonText}>{t.restart}</Text>
          </Pressable>
        </>) : (<>
          <View style={styles.options}>
            {options.map((step) => {
                const position = selected.indexOf(step.id);
                return (<Pressable key={step.id} accessibilityRole="button" accessibilityLabel={step.description[contentLanguage]} accessibilityState={{ selected: position >= 0 }} disabled={position >= 0} onPress={() => choose(step.id)} style={[styles.option, position >= 0 && styles.selected]}>
                  <GroceryScene scene={step.order - 1} label={step.description[contentLanguage]}/>
                  {position >= 0 ? <Text style={styles.selectedText}>{t.step} {position + 1}: {step.words[contentLanguage]}</Text> : null}
                </Pressable>);
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
    scene: { width: "100%", height: 132, borderRadius: 9, backgroundColor: "var(--elovio-source-64)", overflow: "hidden", alignItems: "center", justifyContent: "center" },
    wall: { position: "absolute", top: 0, width: "100%", height: "82%", backgroundColor: "var(--elovio-source-65)" },
    floor: { position: "absolute", bottom: 0, width: "100%", height: "18%", backgroundColor: "var(--elovio-source-66)" },
    basketHandle: { position: "absolute", top: 26, width: 70, height: 48, borderWidth: 7, borderColor: "var(--elovio-source-67)", borderBottomWidth: 0, borderTopLeftRadius: 36, borderTopRightRadius: 36 },
    basket: { position: "absolute", top: 61, width: 100, height: 54, backgroundColor: "var(--elovio-source-68)", borderWidth: 3, borderColor: "var(--elovio-source-69)", borderBottomLeftRadius: 12, borderBottomRightRadius: 12, overflow: "hidden" },
    basketLineOne: { position: "absolute", top: 0, left: 28, width: 4, height: "100%", backgroundColor: "var(--elovio-source-69)" },
    basketLineTwo: { position: "absolute", top: 0, right: 28, width: 4, height: "100%", backgroundColor: "var(--elovio-source-69)" },
    shelf: { position: "absolute", top: 37, width: "88%", height: 9, backgroundColor: "var(--elovio-source-70)", borderRadius: 3 },
    shelfLower: { position: "absolute", top: 91, width: "88%", height: 9, backgroundColor: "var(--elovio-source-70)", borderRadius: 3 },
    produce: { position: "absolute", width: 30, height: 30, borderRadius: 15 },
    apple: { top: 7, left: "25%", backgroundColor: "var(--elovio-source-71)" },
    orange: { top: 7, left: "46%", backgroundColor: "var(--elovio-source-72)" },
    pear: { top: 7, right: "24%", backgroundColor: "var(--elovio-source-73)", borderBottomLeftRadius: 8, borderBottomRightRadius: 8 },
    checkout: { position: "absolute", bottom: 35, width: "85%", height: 48, backgroundColor: "var(--elovio-source-74)", borderRadius: 8 },
    checkoutBelt: { position: "absolute", bottom: 48, left: "17%", width: "54%", height: 8, backgroundColor: "var(--elovio-source-75)", borderRadius: 4 },
    cardTerminal: { position: "absolute", top: 25, right: "15%", width: 42, height: 53, backgroundColor: "var(--elovio-source-1)", borderRadius: 6, padding: 5 },
    terminalScreen: { height: 17, backgroundColor: "var(--elovio-source-76)", borderRadius: 3 },
    bankCard: { position: "absolute", top: 64, right: "35%", width: 36, height: 24, backgroundColor: "var(--elovio-source-35)", borderRadius: 4, borderWidth: 2, borderColor: "var(--elovio-source-3)" },
    bagBody: { position: "absolute", bottom: 18, width: 91, height: 83, backgroundColor: "var(--elovio-source-77)", borderBottomLeftRadius: 10, borderBottomRightRadius: 10 },
    bagHandle: { position: "absolute", bottom: 94, width: 38, height: 28, borderWidth: 5, borderColor: "var(--elovio-source-78)", borderBottomWidth: 0, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
    bagApple: { top: 32, left: "36%", width: 25, height: 25, backgroundColor: "var(--elovio-source-71)" },
    bagOrange: { top: 23, right: "34%", width: 25, height: 25, backgroundColor: "var(--elovio-source-72)" },
    bagBread: { position: "absolute", top: 27, left: "47%", width: 36, height: 18, borderRadius: 10, backgroundColor: "var(--elovio-source-79)", transform: [{ rotate: "-16deg" }] },
    selectedText: { color: "var(--elovio-source-1)", fontWeight: "700", fontSize: 11, padding: 3 },
    success: { color: "var(--elovio-source-1)", fontSize: 16, fontWeight: "700" },
    row: { flexDirection: "row", gap: 10, alignItems: "center" },
    number: { backgroundColor: "var(--elovio-source-80)", color: "var(--elovio-source-1)", fontWeight: "800", padding: 10, borderRadius: 10 },
    copy: { flex: 1 },
    word: { color: "var(--elovio-source-6)", fontWeight: "700" },
    button: { backgroundColor: "var(--elovio-source-1)", padding: 13, borderRadius: 12, alignItems: "center" },
    buttonText: { color: "var(--elovio-source-3)", fontWeight: "700" },
    error: { color: "var(--elovio-source-81)", fontWeight: "600" },
    attribution: { color: "var(--elovio-source-82)", fontSize: 10 },
});
