import type { LanguageCode } from "../config/languages";

export type VisualSequenceStep = {
  id: string;
  order: number;
  illustrationStep: number;
  words: Record<LanguageCode, string>;
  description: Record<LanguageCode, string>;
};

export const COFFEE_PREPARATION_SEQUENCE: readonly VisualSequenceStep[] = [
  {
    id: "fill-kettle",
    order: 1,
    illustrationStep: 0,
    words: { fi: "täyttää vedenkeitin", es: "llenar el hervidor", en: "fill the kettle" },
    description: { fi: "Täytä vedenkeitin puhtaalla vedellä", es: "Llena el hervidor con agua limpia", en: "Fill the kettle with clean water" },
  },
  {
    id: "heat-water",
    order: 2,
    illustrationStep: 1,
    words: { fi: "kuumentaa vesi", es: "calentar el agua", en: "heat the water" },
    description: { fi: "Kuumenna vesi vedenkeittimessä", es: "Calienta el agua en el hervidor", en: "Heat the water in the kettle" },
  },
  {
    id: "prepare-filter",
    order: 3,
    illustrationStep: 2,
    words: { fi: "lisätä kahvijauhe suodattimeen", es: "poner café molido en el filtro", en: "put ground coffee in the filter" },
    description: { fi: "Lisää kahvijauhe suodattimeen", es: "Pon café molido en el filtro", en: "Put ground coffee in the filter" },
  },
  {
    id: "pour-water",
    order: 4,
    illustrationStep: 3,
    words: { fi: "kaataa kuuma vesi", es: "verter agua caliente", en: "pour hot water" },
    description: { fi: "Kaada kuuma vesi kahvijauheen päälle ja anna kahvin valua kuppiin", es: "Vierte el agua caliente sobre el café molido y deja que caiga en la taza", en: "Pour hot water over the grounds and let the coffee drip into the cup" },
  },
] as const;
