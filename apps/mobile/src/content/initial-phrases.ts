import type { LanguageCode } from "../config/languages";

export type StarterPhrase = {
  id: string;
  translations: Record<"fi" | "es" | "en", string>;
  explanations: Record<"fi" | "es" | "en", string>;
};

export const STARTER_PHRASES: readonly StarterPhrase[] = [
  {
    id: "greeting-hello",
    translations: { fi: "Hei", es: "Hola", en: "Hello" },
    explanations: {
      fi: "Yleinen tervehdys, jota voit käyttää lähes kaikissa arkisissa tilanteissa.",
      es: "Un saludo habitual que puedes utilizar en casi cualquier situación cotidiana.",
      en: "A common greeting you can use in almost any everyday situation.",
    },
  },
  {
    id: "greeting-morning",
    translations: { fi: "Hyvää huomenta", es: "Buenos días", en: "Good morning" },
    explanations: {
      fi: "Aamulla käytettävä kohtelias tervehdys.",
      es: "Un saludo cordial que se utiliza por la mañana.",
      en: "A polite greeting used in the morning.",
    },
  },
  {
    id: "question-how-are-you",
    translations: { fi: "Mitä kuuluu?", es: "¿Cómo estás?", en: "How are you?" },
    explanations: {
      fi: "Tavallinen kysymys kuulumisista. Espanjassa muoto on epämuodollinen yksikölle.",
      es: "Una pregunta habitual para interesarse por otra persona. Esta forma es informal y singular.",
      en: "A common way to ask about someone. This is the informal singular form in Spanish.",
    },
  },
  {
    id: "introduction-name",
    translations: { fi: "Nimeni on…", es: "Me llamo…", en: "My name is…" },
    explanations: {
      fi: "Käytä tätä, kun kerrot oman nimesi. Lisää nimesi ilmauksen loppuun.",
      es: "Utiliza esta expresión para presentarte. Añade tu nombre al final.",
      en: "Use this expression to introduce yourself. Add your name at the end.",
    },
  },
  {
    id: "politeness-please",
    translations: { fi: "Ole hyvä", es: "Por favor", en: "Please" },
    explanations: {
      fi: "Kohtelias ilmaus pyynnön yhteydessä. Espanjassa se sijoitetaan usein pyynnön yhteyteen.",
      es: "Una expresión de cortesía que se utiliza al hacer una petición.",
      en: "A polite expression used when making a request.",
    },
  },
  {
    id: "politeness-thank-you",
    translations: { fi: "Kiitos", es: "Gracias", en: "Thank you" },
    explanations: {
      fi: "Yleinen kiitoksen ilmaus. Voit vastata esimerkiksi «De nada» espanjaksi.",
      es: "Una forma habitual de dar las gracias. Puedes responder «De nada».",
      en: "A common way to express gratitude. A typical response in Spanish is «De nada».",
    },
  },
  {
    id: "farewell-see-you",
    translations: { fi: "Nähdään myöhemmin", es: "Hasta luego", en: "See you later" },
    explanations: {
      fi: "Ystävällinen hyvästely, kun odotat tapaavasi henkilön uudelleen.",
      es: "Una despedida cordial cuando esperas volver a ver a la persona.",
      en: "A friendly farewell when you expect to see the person again.",
    },
  },
  {
    id: "travel-toilet",
    translations: { fi: "Missä on WC?", es: "¿Dónde está el aseo?", en: "Where is the toilet?" },
    explanations: {
      fi: "Kohtelias tapa kysyä WC:n sijaintia. Espanjassa «aseo» on tavallinen sana.",
      es: "Una forma habitual y educada de preguntar dónde está el servicio.",
      en: "A polite, everyday way to ask where the restroom is.",
    },
  },
  {
    id: "communication-no-understand",
    translations: { fi: "En ymmärrä.", es: "No entiendo.", en: "I don't understand." },
    explanations: {
      fi: "Kerro tällä, ettet ymmärtänyt sanottua. Voit jatkaa pyytämällä puhumaan hitaammin.",
      es: "Dilo cuando no hayas comprendido algo. Puedes añadir que hablen más despacio.",
      en: "Use this when you have not understood something. You can follow it by asking someone to speak more slowly.",
    },
  },
  {
    id: "communication-slowly",
    translations: { fi: "Voitteko puhua hitaammin?", es: "¿Puede hablar más despacio, por favor?", en: "Could you speak more slowly, please?" },
    explanations: {
      fi: "Kohtelias pyyntö, kun puhe on liian nopeaa. Espanjan muoto on kohtelias teitittely.",
      es: "Una petición educada en la que se utiliza el tratamiento formal «usted».",
      en: "A polite request to slow down. The Spanish version uses the formal form.",
    },
  },
  {
    id: "help-can-you-help",
    translations: { fi: "Voitteko auttaa minua?", es: "¿Me puede ayudar?", en: "Can you help me?" },
    explanations: {
      fi: "Käytä tätä, kun tarvitset apua. Espanjan muoto on kohtelias ja sopii myös tuntemattomalle.",
      es: "Una forma educada de pedir ayuda, adecuada también cuando hablas con alguien que no conoces.",
      en: "Use this to ask for help. The Spanish version is polite and suitable for someone you do not know.",
    },
  },
  {
    id: "shopping-how-much",
    translations: { fi: "Paljonko tämä maksaa?", es: "¿Cuánto cuesta esto?", en: "How much does this cost?" },
    explanations: {
      fi: "Hyödyllinen kysymys kaupassa, torilla tai palvelua ostaessa.",
      es: "Una pregunta útil en una tienda, un mercado o al comprar un servicio.",
      en: "A useful question in a shop, at a market, or when buying a service.",
    },
  },
  {
    id: "food-water",
    translations: { fi: "Vettä, kiitos.", es: "Agua, por favor.", en: "Water, please." },
    explanations: {
      fi: "Yksinkertainen ja kohtelias tapa pyytää vettä ravintolassa tai kahvilassa.",
      es: "Una forma sencilla y educada de pedir agua en un restaurante o una cafetería.",
      en: "A simple, polite way to ask for water in a restaurant or café.",
    },
  },
  {
    id: "food-coffee",
    translations: { fi: "Kahvi, kiitos.", es: "Un café, por favor.", en: "A coffee, please." },
    explanations: {
      fi: "Voit käyttää tätä kahvilassa tilausta tehdessäsi.",
      es: "Puedes utilizar esta expresión para pedir un café en una cafetería.",
      en: "Use this expression when ordering a coffee.",
    },
  },
  {
    id: "food-bill",
    translations: { fi: "Lasku, kiitos.", es: "La cuenta, por favor.", en: "The bill, please." },
    explanations: {
      fi: "Pyydä tällä laskua ravintolassa. Espanjassa «la cuenta» tarkoittaa laskua.",
      es: "Se utiliza para pedir la cuenta al terminar de comer en un restaurante.",
      en: "Use this to ask for the bill at the end of a meal.",
    },
  },
  {
    id: "travel-reservation",
    translations: { fi: "Minulla on varaus nimellä…", es: "Tengo una reserva a nombre de…", en: "I have a reservation under the name…" },
    explanations: {
      fi: "Käytä hotellissa tai ravintolassa. Lisää oman varauksesi nimi ilmauksen loppuun.",
      es: "Se utiliza en un hotel o restaurante. Añade el nombre de la reserva al final.",
      en: "Use this at a hotel or restaurant. Add the name on your booking at the end.",
    },
  },
  {
    id: "communication-english",
    translations: { fi: "Puhutteko englantia?", es: "¿Habla inglés?", en: "Do you speak English?" },
    explanations: {
      fi: "Kohtelias kysymys, kun haluat selvittää, voitteko jatkaa keskustelua englanniksi.",
      es: "Una pregunta educada para saber si podéis continuar la conversación en inglés.",
      en: "A polite question to find out whether you can continue the conversation in English.",
    },
  },
  {
    id: "communication-repeat",
    translations: { fi: "Voitteko toistaa?", es: "¿Puede repetirlo?", en: "Could you repeat that?" },
    explanations: {
      fi: "Pyydä tällä toistamaan jokin, jonka kuulit epäselvästi.",
      es: "Se utiliza para pedir que repitan algo que no has oído o entendido bien.",
      en: "Use this to ask someone to repeat something you did not hear clearly.",
    },
  },
  {
    id: "introduction-learning",
    translations: { fi: "Opettelen espanjaa.", es: "Estoy aprendiendo español.", en: "I'm learning Spanish." },
    explanations: {
      fi: "Kerro tällä, että opiskelet espanjaa. Se auttaa asettamaan odotukset keskustelussa.",
      es: "Puedes decirlo para explicar que todavía estás aprendiendo el idioma.",
      en: "Use this to explain that you are still learning the language.",
    },
  },
  {
    id: "introduction-meet",
    translations: { fi: "Hauska tutustua.", es: "Mucho gusto.", en: "Nice to meet you." },
    explanations: {
      fi: "Ystävällinen ilmaus, jota käytetään tavatessa uusi ihminen.",
      es: "Una expresión cordial que se utiliza al conocer a alguien por primera vez.",
      en: "A friendly expression used when meeting someone for the first time.",
    },
  },
  {
    id: "payment-card",
    translations: { fi: "Käykö kortti?", es: "¿Aceptan tarjeta?", en: "Do you accept cards?" },
    explanations: {
      fi: "Kysy tällä, voiko ostoksen maksaa maksukortilla.",
      es: "Una pregunta útil para saber si puedes pagar con tarjeta.",
      en: "A useful question to check whether you can pay by card.",
    },
  },

  {
    id: "travel-station",
    translations: { fi: "Missä rautatieasema on?", es: "¿Dónde está la estación de tren?", en: "Where is the train station?" },
    explanations: {
      fi: "Hyödyllinen kysymys, kun etsit junalle tai haluat varmistaa aseman sijainnin.",
      es: "Una pregunta útil cuando buscas la estación para coger un tren.",
      en: "A useful question when you are looking for the station to catch a train.",
    },
  },
  {
    id: "travel-departure-time",
    translations: { fi: "Mihin aikaan juna lähtee?", es: "¿A qué hora sale el tren?", en: "What time does the train leave?" },
    explanations: {
      fi: "Kysy tällä junan lähtöaikaa esimerkiksi asemalla.",
      es: "Se utiliza para preguntar la hora de salida de un tren.",
      en: "Use this to ask when a train departs.",
    },
  },
  {
    id: "food-menu",
    translations: { fi: "Saisinko ruokalistan?", es: "¿Me trae la carta, por favor?", en: "Could I have the menu, please?" },
    explanations: {
      fi: "Kohtelias tapa pyytää ruokalistaa ravintolassa. Espanjan muoto on tavallinen kohtelias pyyntö.",
      es: "Una petición educada y habitual para pedir la carta en un restaurante.",
      en: "A polite, common way to ask for the menu in a restaurant.",
    },
  },
  {
    id: "food-table",
    translations: { fi: "Onko teillä pöytää kahdelle?", es: "¿Tiene una mesa para dos?", en: "Do you have a table for two?" },
    explanations: {
      fi: "Käytä tätä ravintolaan saapuessasi, kun tarvitset pöydän kahdelle.",
      es: "Se utiliza al llegar a un restaurante para pedir una mesa para dos personas.",
      en: "Use this when arriving at a restaurant and asking for a table for two.",
    },
  },
  {
    id: "food-no-ice",
    translations: { fi: "Ilman jäitä, kiitos.", es: "Sin hielo, por favor.", en: "No ice, please." },
    explanations: {
      fi: "Lisää tämä juomatilaukseen, kun et halua siihen jäitä.",
      es: "Puedes añadirlo al pedir una bebida si no quieres hielo.",
      en: "Add this to a drink order when you do not want ice.",
    },
  },
  {
    id: "shopping-just-looking",
    translations: { fi: "Katselen vain, kiitos.", es: "Solo estoy mirando, gracias.", en: "I'm just looking, thank you." },
    explanations: {
      fi: "Ystävällinen vastaus myyjälle, kun et tarvitse vielä apua.",
      es: "Una respuesta amable cuando un dependiente te ofrece ayuda y solo quieres mirar.",
      en: "A friendly response when a shop assistant offers help and you only want to browse.",
    },
  },
  {
    id: "shopping-card-payment",
    translations: { fi: "Voinko maksaa kortilla?", es: "¿Puedo pagar con tarjeta?", en: "Can I pay by card?" },
    explanations: {
      fi: "Kysy tällä, voitko maksaa ostoksesi maksukortilla.",
      es: "Una pregunta directa para confirmar si puedes pagar con tarjeta.",
      en: "A direct question to confirm whether you can pay by card.",
    },
  },
  {
    id: "communication-understand",
    translations: { fi: "Ymmärrän vähän espanjaa.", es: "Entiendo un poco de español.", en: "I understand a little Spanish." },
    explanations: {
      fi: "Kerro tällä keskustelukumppanille, että ymmärrät espanjaa jonkin verran.",
      es: "Sirve para explicar que comprendes algo de español, aunque no todo.",
      en: "Use this to explain that you understand some Spanish, but not everything.",
    },
  },
  {
    id: "help-where-pharmacy",
    translations: { fi: "Missä on lähin apteekki?", es: "¿Dónde está la farmacia más cercana?", en: "Where is the nearest pharmacy?" },
    explanations: {
      fi: "Hyödyllinen kysymys, kun tarvitset apteekkia matkalla.",
      es: "Una pregunta práctica cuando necesitas encontrar una farmacia cercana.",
      en: "A practical question when you need to find a nearby pharmacy.",
    },
  },
] as const;

export function getPhraseText(
  phrase: StarterPhrase,
  language: LanguageCode,
): string {
  return phrase.translations[language as "fi" | "es" | "en"] ?? phrase.translations.en;
}

export function getPhraseExplanation(
  phrase: StarterPhrase,
  language: LanguageCode,
): string {
  return phrase.explanations[language as "fi" | "es" | "en"] ?? phrase.explanations.en;
}
