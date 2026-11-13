import {useState} from "react";
import {Pressable,StyleSheet,Text,View} from "react-native";
import type {LanguageCode} from "../../config/languages";
import {resolveContentLanguage} from "../../services/content-language";
import {CAFE_DIALOGUE} from "../../content/cafe-dialogue";
import {isCorrectCafeDialogueResponse} from "../../services/cafe-dialogue";
const COPY={
fi:{title:"Keskustele kahvilassa",intro:"Harjoittele kahvilakeskustelua. Lue henkilökunnan repliikki ja valitse tilanteeseen sopiva vastaus.",staff:"Henkilökunta",choose:"Mitä vastaat?",correct:"Hyvä vastaus!",retry:"Kokeile vielä. Mieti, mitä toinen henkilö kysyi.",next:"Jatka keskustelua",done:"Hienosti! Selvisit koko kahvilakeskustelusta.",restart:"Aloita uudelleen",step:"Tilanne"},
es:{title:"Conversa en una cafetería",intro:"Practica una conversación en una cafetería. Lee la frase del personal y elige una respuesta adecuada.",staff:"Personal",choose:"¿Qué respondes?",correct:"¡Buena respuesta!",retry:"Inténtalo de nuevo. Piensa qué te ha preguntado la otra persona.",next:"Continuar la conversación",done:"¡Muy bien! Has completado toda la conversación.",restart:"Empezar de nuevo",step:"Situación"},
en:{title:"Have a conversation at a café",intro:"Practise a café conversation. Read the staff member's line and choose a suitable response.",staff:"Staff",choose:"What do you say?",correct:"Good answer!",retry:"Try again. Think about what the other person asked.",next:"Continue conversation",done:"Well done! You completed the whole café conversation.",restart:"Start again",step:"Situation"}
} as const;
export function CafeDialogueExercise({interfaceLanguage,learningLanguage}:{interfaceLanguage:LanguageCode;learningLanguage:LanguageCode}){
const lang=resolveContentLanguage(interfaceLanguage),contentLanguage=resolveContentLanguage(learningLanguage),t=COPY[lang];
const [turnIndex,setTurnIndex]=useState(0),[selectedId,setSelectedId]=useState<string|null>(null),[showFeedback,setShowFeedback]=useState(false);
const turn=CAFE_DIALOGUE[turnIndex],selected=turn?.options.find(o=>o.id===selectedId),complete=turnIndex>=CAFE_DIALOGUE.length;
function next(){setTurnIndex(i=>i+1);setSelectedId(null);setShowFeedback(false);}
function restart(){setTurnIndex(0);setSelectedId(null);setShowFeedback(false);}
return <View style={styles.card}>
<Text style={styles.title}>{t.title}</Text><Text style={styles.body}>{t.intro}</Text>
<Text style={styles.progress}>{t.step} {Math.min(turnIndex+1,CAFE_DIALOGUE.length)} / {CAFE_DIALOGUE.length}</Text>
<View style={styles.track}><View style={[styles.fill,{width:String(turnIndex/CAFE_DIALOGUE.length*100)+"%"}]}/></View>
{complete?<><Text accessibilityRole="text" style={styles.success}>{t.done}</Text><Pressable accessibilityRole="button" onPress={restart} style={styles.button}><Text style={styles.buttonText}>{t.restart}</Text></Pressable></>:<>
<View style={styles.staffBubble}><Text style={styles.speaker}>{t.staff}</Text><Text style={styles.dialogue}>{turn.prompt[contentLanguage]}</Text></View>
<Text style={styles.prompt}>{t.choose}</Text>
{turn.options.map(option=><Pressable key={option.id} accessibilityRole="button" accessibilityState={{selected:selectedId===option.id,disabled:showFeedback}} disabled={showFeedback} onPress={()=>{setSelectedId(option.id);setShowFeedback(true);}} style={[styles.option,selectedId===option.id&&styles.optionSelected]}><Text style={styles.optionText}>{option.text[contentLanguage]}</Text></Pressable>)}
{showFeedback&&selected?<View style={selected.correct?styles.feedbackGood:styles.feedbackBad}><Text style={styles.feedbackTitle}>{selected.correct?t.correct:t.retry}</Text><Text style={styles.body}>{selected.feedback[lang]}</Text>{selected.correct?<Pressable accessibilityRole="button" onPress={next} style={styles.button}><Text style={styles.buttonText}>{t.next}</Text></Pressable>:<Pressable accessibilityRole="button" onPress={()=>{setSelectedId(null);setShowFeedback(false);}} style={styles.tryButton}><Text style={styles.tryText}>{t.retry}</Text></Pressable>}</View>:null}
</>}
</View>;
}
const styles=StyleSheet.create({
card:{backgroundColor:"#FFFFFF",borderRadius:22,padding:18,gap:14,borderWidth:1,borderColor:"#E8E9E2"},title:{color:"#183D32",fontSize:24,fontWeight:"700"},body:{color:"#52645B",fontSize:13,lineHeight:20},progress:{color:"#315D4C",fontSize:13,fontWeight:"700"},track:{height:7,backgroundColor:"#E2E8E1",borderRadius:8,overflow:"hidden"},fill:{height:"100%",backgroundColor:"#477C62",borderRadius:8},staffBubble:{alignSelf:"flex-start",maxWidth:"92%",backgroundColor:"#EAF0E9",borderRadius:16,padding:14,gap:7},speaker:{fontSize:11,fontWeight:"800",color:"#477C62",textTransform:"uppercase"},dialogue:{fontSize:18,fontWeight:"600",color:"#183D32",lineHeight:26},prompt:{fontSize:15,fontWeight:"700",color:"#183D32"},option:{borderWidth:1,borderColor:"#D5DDD4",borderRadius:12,padding:14,backgroundColor:"#F8F8F3"},optionSelected:{borderColor:"#477C62",backgroundColor:"#EAF0E9"},optionText:{fontSize:15,color:"#244638",lineHeight:22},feedbackGood:{backgroundColor:"#EDF4EC",borderRadius:12,padding:13,gap:9},feedbackBad:{backgroundColor:"#F8EEE9",borderRadius:12,padding:13,gap:9},feedbackTitle:{fontSize:14,fontWeight:"800",color:"#315D4C"},success:{fontSize:16,fontWeight:"700",color:"#315D4C"},button:{padding:13,backgroundColor:"#315D4C",borderRadius:12,alignItems:"center"},buttonText:{color:"#FFFFFF",fontWeight:"700"},tryButton:{padding:10,alignItems:"center"},tryText:{color:"#315D4C",fontWeight:"700"}
});
