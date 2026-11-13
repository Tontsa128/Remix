import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { LanguageCode } from "../../config/languages";
import { resolveContentLanguage } from "../../services/content-language";
import { CAFE_ORDER_SEQUENCE } from "../../content/cafe-order-sequence";
import { createCafeOrderRound, isNextCafeOrderStep } from "../../services/cafe-order-sequence";

const COPY = {
  fi: { title: "Tilaa kahvilassa", intro: "Kahvilassa asiointi on helppoa, kun etenet vaiheittain. Järjestä kuvat oikeaan järjestykseen.", progress: "Oikein järjestetyt vaiheet", retry: "Ei aivan. Mieti, mitä tapahtuu seuraavaksi.", step: "Vaihe", complete: "Hienoa! Osaat asioida kahvilassa.", restart: "Harjoittele uudelleen", source: "Elovion alkuperäiset piirrokset · Kahvilassa asiointi" },
  es: { title: "Pide en una cafetería", intro: "Pedir en una cafetería es fácil paso a paso. Ordena las imágenes correctamente.", progress: "Pasos ordenados correctamente", retry: "No exactamente. Piensa qué sucede después.", step: "Paso", complete: "¡Muy bien! Sabes pedir en una cafetería.", restart: "Practicar otra vez", source: "Ilustraciones originales de Elovio · Pedir en una cafetería" },
  en: { title: "Order at a café", intro: "Ordering at a café is easy when you follow the steps. Put the pictures in the correct order.", progress: "Steps in the correct order", retry: "Not quite. Think about what happens next.", step: "Step", complete: "Well done! You know how to order at a café.", restart: "Practise again", source: "Original Elovio illustrations · Ordering at a café" },
} as const;

function CafeScene({ scene, label }: { scene: number; label: string }) {
  return <View accessible accessibilityLabel={label} style={styles.scene}>
    <View style={styles.wallLight} /><View style={styles.counter} />
    {scene === 0 ? <View style={styles.menuBoard}><Text style={styles.menuTitle}>MENU</Text><View style={styles.menuLine}/><View style={styles.menuLine}/><View style={styles.menuLineShort}/><View style={styles.menuCup}><View style={styles.menuCupCoffee}/><View style={styles.menuCupHandle}/></View></View> : null}
    {scene === 1 ? <><View style={styles.personHead}/><View style={styles.personBody}/><View style={styles.speech}><Text style={styles.speechText}>Hello!</Text></View><View style={styles.orderCup}/></> : null}
    {scene === 2 ? <><View style={styles.terminal}><View style={styles.terminalScreen}><Text style={styles.check}>✓</Text></View><View style={styles.terminalBase}/></View><View style={styles.cardPayment}/></> : null}
    {scene === 3 ? <><View style={styles.pickupShelf}/><View style={styles.cupHandle}/><View style={styles.cup}><View style={styles.coffee}/></View><View style={styles.steam}/><View style={styles.pickupBell}/></> : null}
  </View>;
}

export function CafeOrderSequenceExercise({ interfaceLanguage, learningLanguage }: { interfaceLanguage: LanguageCode; learningLanguage: LanguageCode }) {
  const language = interfaceLanguage === "fi" ? "fi" : interfaceLanguage === "es" ? "es" : "en";
  const t = COPY[language];
  const contentLanguage = resolveContentLanguage(learningLanguage);
  const [round, setRound] = useState(() => createCafeOrderRound());
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [incorrect, setIncorrect] = useState(false);
  const complete = selectedIds.length === CAFE_ORDER_SEQUENCE.length;
  const options = round.optionIds.map((id) => CAFE_ORDER_SEQUENCE.find((step) => step.id === id)).filter((step): step is (typeof CAFE_ORDER_SEQUENCE)[number] => Boolean(step));

  function choose(id: string) {
    if (complete || selectedIds.includes(id)) return;
    if (!isNextCafeOrderStep(id, selectedIds.length)) { setIncorrect(true); return; }
    setIncorrect(false);
    setSelectedIds((current) => [...current, id]);
  }

  function restart() { setRound(createCafeOrderRound()); setSelectedIds([]); setIncorrect(false); }

  return <View style={styles.card}>
    <Text style={styles.title}>{t.title}</Text><Text style={styles.body}>{t.intro}</Text>
    <Text style={styles.progress}>{t.progress}: {selectedIds.length} / {CAFE_ORDER_SEQUENCE.length}</Text>
    <View style={styles.track}><View style={[styles.fill, { width: String(selectedIds.length / CAFE_ORDER_SEQUENCE.length * 100) + "%" }]} /></View>
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
 card:{backgroundColor:"#FFFFFF",borderRadius:22,padding:18,gap:14,borderWidth:1,borderColor:"#E8E9E2"},
 title:{color:"#183D32",fontSize:24,fontWeight:"700"},body:{color:"#52645B",fontSize:13,lineHeight:20},
 progress:{color:"#315D4C",fontSize:13,fontWeight:"700"},track:{height:7,backgroundColor:"#E2E8E1",borderRadius:8,overflow:"hidden"},fill:{height:"100%",backgroundColor:"#477C62",borderRadius:8},
 options:{flexDirection:"row",flexWrap:"wrap",gap:10},option:{width:"48%",minHeight:164,borderWidth:1,borderColor:"#D5DDD4",borderRadius:13,backgroundColor:"#F8F8F3",overflow:"hidden",padding:6,justifyContent:"space-between"},selected:{borderColor:"#477C62",backgroundColor:"#EAF0E9"},
 scene:{width:"100%",height:132,borderRadius:9,backgroundColor:"#E8E3D7",overflow:"hidden",alignItems:"center",justifyContent:"center"},
 wallLight:{position:"absolute",top:0,width:"100%",height:"62%",backgroundColor:"#F4ECDD"},counter:{position:"absolute",bottom:0,width:"100%",height:25,backgroundColor:"#B68A65"},
 menuBoard:{width:92,height:112,backgroundColor:"#315D4C",borderRadius:6,padding:9,gap:7,alignItems:"center"},menuTitle:{color:"#FFF8E9",fontSize:13,fontWeight:"800",letterSpacing:2},menuLine:{width:"80%",height:3,backgroundColor:"#D8D2B9"},menuLineShort:{width:"55%",height:3,backgroundColor:"#D8D2B9"},menuCup:{width:23,height:17,backgroundColor:"#FFF8E9",borderBottomLeftRadius:5,borderBottomRightRadius:5,alignItems:"center",marginTop:1},menuCupCoffee:{width:17,height:4,backgroundColor:"#68452F",borderRadius:3},menuCupHandle:{position:"absolute",right:-6,top:3,width:9,height:9,borderWidth:2,borderColor:"#FFF8E9",borderRadius:7},
 personHead:{position:"absolute",top:26,left:"25%",width:30,height:30,borderRadius:15,backgroundColor:"#C98F68"},personBody:{position:"absolute",bottom:25,left:"22%",width:42,height:52,borderRadius:12,backgroundColor:"#547C70"},speech:{position:"absolute",top:19,right:"13%",width:74,height:35,borderRadius:12,backgroundColor:"#FFFFFF",alignItems:"center",justifyContent:"center"},speechText:{fontSize:10,color:"#315D4C",fontWeight:"700"},orderCup:{position:"absolute",bottom:25,right:"20%",width:29,height:26,borderRadius:4,backgroundColor:"#FFF8E9",borderBottomWidth:5,borderColor:"#B68A65"},
 terminal:{position:"absolute",width:70,height:82,top:22,alignItems:"center"},terminalScreen:{width:65,height:57,backgroundColor:"#315D4C",borderRadius:8,alignItems:"center",justifyContent:"center"},check:{fontSize:28,color:"#FFFFFF",fontWeight:"800"},terminalBase:{width:75,height:9,backgroundColor:"#66746C",borderRadius:4},cardPayment:{position:"absolute",bottom:30,right:"19%",width:44,height:30,borderRadius:5,backgroundColor:"#D6A45E",transform:[{rotate:"-12deg"}]},
 pickupShelf:{position:"absolute",top:50,width:"100%",height:12,backgroundColor:"#9D7657"},cup:{position:"absolute",top:61,width:43,height:39,backgroundColor:"#FFF8E9",borderBottomLeftRadius:9,borderBottomRightRadius:9,alignItems:"center"},coffee:{width:35,height:7,backgroundColor:"#68452F",borderRadius:5},cupHandle:{position:"absolute",top:69,left:"58%",width:17,height:20,borderWidth:4,borderColor:"#FFF8E9",borderRadius:12},steam:{position:"absolute",top:32,width:4,height:19,borderRadius:3,backgroundColor:"#AAB7AC"},pickupBell:{position:"absolute",top:38,right:"16%",width:20,height:13,borderTopLeftRadius:12,borderTopRightRadius:12,backgroundColor:"#D7B15D"},
 selectedText:{color:"#315D4C",fontSize:11,fontWeight:"700",padding:4},error:{color:"#A54A3F",fontSize:13,fontWeight:"600"},success:{color:"#315D4C",fontSize:16,fontWeight:"700"},completedRow:{flexDirection:"row",gap:12,alignItems:"center",paddingVertical:8,borderBottomWidth:1,borderBottomColor:"#E8E9E2"},number:{width:28,height:28,textAlign:"center",textAlignVertical:"center",borderRadius:14,overflow:"hidden",backgroundColor:"#EAF0E9",color:"#315D4C",fontWeight:"800"},copy:{flex:1,gap:3},word:{color:"#183D32",fontWeight:"700"},button:{padding:13,backgroundColor:"#315D4C",borderRadius:12,alignItems:"center"},buttonText:{color:"#FFFFFF",fontWeight:"700"},attribution:{color:"#7A867E",fontSize:10,lineHeight:15},
});
