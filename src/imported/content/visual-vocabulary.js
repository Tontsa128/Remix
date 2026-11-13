import dogAsset from "../../assets/golden-retriever.asset.json";
import appleAsset from "../../assets/red-apple.asset.json";
export const VISUAL_VOCABULARY = [
    {
        id: "apple",
        mediaType: "photograph",
        offlineFallbackIllustration: "apple",
        image: appleAsset.url,
        imageDescription: { fi: "Punainen omena", es: "Una manzana roja", en: "A red apple" },
        words: { fi: "omena", es: "manzana", en: "apple" },
        source: "Wikimedia Commons · Red-apple.jpg",
        author: "Plismo",
        license: "CC BY-SA 3.0",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:Red-apple.jpg",
    },
    {
        id: "dog",
        mediaType: "photograph",
        offlineFallbackIllustration: "dog",
        image: dogAsset.url,
        imageDescription: { fi: "Kultainennoutaja", es: "Un golden retriever", en: "A golden retriever" },
        words: { fi: "koira", es: "perro", en: "dog" },
        source: "Wikimedia Commons · Image of golden retriever.jpg",
        author: "A throne man",
        license: "CC0 1.0",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:Image_of_golden_retriever.jpg",
    },
    {
        id: "house",
        mediaType: "illustration",
        illustrationKind: "house",
        imageDescription: { fi: "Piirretty pieni talo", es: "Una casa pequeña dibujada", en: "A small illustrated house" },
        words: { fi: "talo", es: "casa", en: "house" },
        source: "Original vector-style illustration composed from native app shapes",
        author: "Elovio",
        license: "Original Elovio artwork",
    },
    {
        id: "coffee",
        mediaType: "illustration",
        illustrationKind: "coffee",
        imageDescription: { fi: "Piirretty kahvikuppi, jossa on höyryävä kahvi", es: "Una taza dibujada con café humeante", en: "An illustrated cup of steaming coffee" },
        words: { fi: "kahvi", es: "café", en: "coffee" },
        source: "Original Elovio illustration rendered from native app shapes",
        author: "Elovio",
        license: "Original Elovio artwork",
    },
    {
        id: "bus",
        mediaType: "illustration",
        illustrationKind: "bus",
        imageDescription: { fi: "Piirretty linja-auto kahdella pyörällä", es: "Un autobús ilustrado con dos ruedas", en: "An illustrated bus with two wheels" },
        words: { fi: "bussi", es: "autobús", en: "bus" },
        source: "Original Elovio illustration rendered from native app shapes",
        author: "Elovio",
        license: "Original Elovio artwork",
    },
    {
        id: "book",
        mediaType: "illustration",
        illustrationKind: "book",
        imageDescription: { fi: "Avoin piirretty kirja, jossa näkyy sivuja", es: "Un libro abierto ilustrado con páginas visibles", en: "An illustrated open book with visible pages" },
        words: { fi: "kirja", es: "libro", en: "book" },
        source: "Original Elovio illustration rendered from native app shapes",
        author: "Elovio",
        license: "Original Elovio artwork",
    },
];
export function getVisualVocabularyOptions(entryId, language, random = Math.random) {
    const correctEntry = VISUAL_VOCABULARY.find((entry) => entry.id === entryId);
    if (!correctEntry)
        return [];
    const distractors = VISUAL_VOCABULARY.filter((entry) => entry.id !== entryId);
    for (let index = distractors.length - 1; index > 0; index -= 1) {
        const value = random();
        const swapIndex = Math.max(0, Math.min(index, Math.floor(value * (index + 1))));
        [distractors[index], distractors[swapIndex]] = [distractors[swapIndex], distractors[index]];
    }
    const entries = [correctEntry, ...distractors.slice(0, 2)];
    for (let index = entries.length - 1; index > 0; index -= 1) {
        const value = random();
        const swapIndex = Math.max(0, Math.min(index, Math.floor(value * (index + 1))));
        [entries[index], entries[swapIndex]] = [entries[swapIndex], entries[index]];
    }
    return entries.map((entry) => ({ id: entry.id, word: entry.words[language] }));
}
export function isValidVisualVocabularyEntry(entry) {
    const hasImageSource = entry.mediaType === "photograph"
        ? Boolean(entry.image && entry.sourceUrl && !entry.illustrationKind && entry.offlineFallbackIllustration)
        : Boolean(!entry.image && entry.illustrationKind);
    const hasAllLanguages = ["fi", "es", "en"].every((language) => Boolean(entry.words[language] && entry.imageDescription[language]));
    return Boolean(entry.id && entry.source && entry.author && entry.license && hasImageSource && hasAllLanguages);
}
