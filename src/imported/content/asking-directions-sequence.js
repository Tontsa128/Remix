export const ASKING_DIRECTIONS_SEQUENCE = [
  {
    id: "check-map",
    order: 1,
    words: { fi: "katsoa karttaa", es: "consultar el mapa", en: "check the map" },
    description: {
      fi: "Katso kartasta, missä olet ja mihin haluat mennä",
      es: "Consulta el mapa para ver dónde estás y adónde quieres ir",
      en: "Check the map to see where you are and where you want to go",
    },
  },
  {
    id: "ask-directions",
    order: 2,
    words: { fi: "kysyä reittiohjeita", es: "pedir indicaciones", en: "ask for directions" },
    description: {
      fi: "Kysy ystävällisesti neuvoa sopivalta henkilöltä",
      es: "Pide indicaciones amablemente a alguien",
      en: "Politely ask someone for directions",
    },
  },
  {
    id: "listen-directions",
    order: 3,
    words: { fi: "kuunnella ohjeita", es: "escuchar las indicaciones", en: "listen to directions" },
    description: {
      fi: "Kuuntele ohjeet rauhassa ja kysy tarvittaessa uudelleen",
      es: "Escucha las indicaciones con calma y pregunta de nuevo si hace falta",
      en: "Listen carefully and ask again if you need clarification",
    },
  },
  {
    id: "follow-route",
    order: 4,
    words: { fi: "seurata reittiä", es: "seguir la ruta", en: "follow the route" },
    description: {
      fi: "Seuraa saamiasi ohjeita ja tarkista reitti tarvittaessa",
      es: "Sigue las indicaciones y vuelve a consultar el mapa si hace falta",
      en: "Follow the directions and check the map again if needed",
    },
  },
];
