import type { LanguageCode } from "@/types/elovio";

const MYMEMORY_BASE = "https://api.mymemory.translated.net/get";

interface MyMemoryResponse {
  responseStatus?: number;
  quotaFinished?: boolean;
  responseData?: {
    translatedText?: string;
  };
}

export async function freeTranslateText(
  text: string,
  from: LanguageCode,
  to: LanguageCode,
): Promise<string | null> {
  const clean = text.trim();
  if (!clean) return null;
  if (from === to) return clean;

  try {
    const url = `${MYMEMORY_BASE}?q=${encodeURIComponent(clean)}&langpair=${from}|${to}`;
    const res = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as MyMemoryResponse;
    if (data.quotaFinished || data.responseStatus !== 200) {
      return null;
    }

    const translated = (data.responseData?.translatedText ?? "").trim();
    if (
      !translated ||
      /MYMEMORY WARNING|PLEASE SELECT TWO DISTINCT|INVALID LANGUAGE PAIR/i.test(
        translated,
      )
    ) {
      return null;
    }

    return translated;
  } catch {
    return null;
  }
}

export async function buildFallbackExplainReply(params: {
  text: string;
  nativeLanguage: LanguageCode;
  targetLanguage: LanguageCode;
}): Promise<string> {
  const clean = params.text.trim();
  const translated =
    (await freeTranslateText(
      clean,
      params.targetLanguage,
      params.nativeLanguage,
    )) ??
    (await freeTranslateText(clean, "en", params.nativeLanguage)) ??
    clean;

  const words = clean
    .replace(/[.,!?;:"'¡¿()]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3)
    .slice(0, 3);

  const wordLines: string[] = [];
  for (const w of words) {
    const t = await freeTranslateText(
      w,
      params.targetLanguage,
      params.nativeLanguage,
    );
    if (t && t.toLowerCase() !== w.toLowerCase()) {
      wordLines.push(`• ${w} = ${t}`);
    }
  }

  const lines = [`1) Käännös:\n${translated}`];
  if (wordLines.length > 0) {
    lines.push(`2) Keskeiset sanat:\n${wordLines.join("\n")}`);
  }
  lines.push(
    `3) Vinkki:\nVoit kuunnella lauseen tai harjoitella sitä Opettajan keskustelussa.`,
  );

  return lines.join("\n\n");
}

const ROLEPLAY_OPENERS: Record<
  "free" | "waiter" | "pharmacist",
  Record<LanguageCode, string>
> = {
  waiter: {
    es: "¡Hola! Bienvenido. ¿Qué le gustaría tomar hoy?",
    en: "Hello! Welcome. What would you like to order today?",
    fi: "Hei! Tervetuloa. Mitä saisimme tuoda teille tänään?",
  },
  pharmacist: {
    es: "Buenos días, ¿en qué puedo ayudarle hoy en la farmacia?",
    en: "Good morning, how can I help you at the pharmacy today?",
    fi: "Hyvää huomenta, miten voin auttaa sinua apteekissa tänään?",
  },
  free: {
    es: "¡Muy bien! Sigamos practicando. ¿Cómo estás hoy?",
    en: "Great! Let's keep practicing. How are you doing today?",
    fi: "Hienoa! Jatketaan harjoittelua. Mitä sinulle kuuluu tänään?",
  },
};

export async function buildFallbackTutorReply(params: {
  lastUserMessage: string;
  nativeLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  roleplay?: "free" | "waiter" | "pharmacist" | undefined;
}): Promise<string> {
  const input = params.lastUserMessage.trim();
  const lower = input.toLowerCase();
  const mode = params.roleplay ?? "free";

  // Check starter topics first
  if (lower.includes("kahvi") || lower.includes("café") || lower.includes("coffee")) {
    const reply =
      params.targetLanguage === "es"
        ? "¡Claro! Un café con leche cuesta dos euros. ¿Quiere algo de comer?"
        : params.targetLanguage === "en"
          ? "Of course! One coffee with milk is two euros. Would you like anything to eat?"
          : "Totta kai! Yksi kahvi maidolla maksaa kaksi euroa. Saisiko olla jotain syötävää?";
    return `${reply}\n\nVinkki: Harjoittele vastaamaan esimerkiksi "${
      params.targetLanguage === "es"
        ? "Sí, un cruasán por favor."
        : params.targetLanguage === "en"
          ? "Yes, a croissant please."
          : "Kyllä, yksi croissant kiitos."
    }"`;
  }

  if (lower.includes("tie") || lower.includes("missä") || lower.includes("dónde") || lower.includes("where")) {
    const reply =
      params.targetLanguage === "es"
        ? "Siga todo recto y gire a la derecha en la esquina. Está muy cerca."
        : params.targetLanguage === "en"
          ? "Go straight ahead and turn right at the corner. It is very close."
          : "Mene suoraan ja käänny oikealle kulmassa. Se on ihan lähellä.";
    return `${reply}\n\nVinkki: Kysy jatkokysymys: "${
      params.targetLanguage === "es"
        ? "Muchas gracias, ¿cuánto se tarda?"
        : params.targetLanguage === "en"
          ? "Thank you, how long does it take?"
          : "Paljon kiitoksia, kuinka kauan sinne menee?"
    }"`;
  }

  if (lower.includes("apteek") || lower.includes("farmacia") || lower.includes("särky") || lower.includes("pain")) {
    const reply =
      params.targetLanguage === "es"
        ? "¿Tiene dolor de cabeza o fiebre? Puedo darle un analgésico suave."
        : params.targetLanguage === "en"
          ? "Do you have a headache or fever? I can give you a mild painkiller."
          : "Onko sinulla päänsärkyä tai kuumetta? Voin antaa miedon särkylääkkeen.";
    return `${reply}\n\nVinkki: Voit vastata oireesi, esim. "${
      params.targetLanguage === "es"
        ? "Sí, me duele la cabeza."
        : params.targetLanguage === "en"
          ? "Yes, I have a headache."
          : "Kyllä, päätäni särkee."
    }"`;
  }

  // Otherwise translate user's sentence to target language as model phrasing + respond with next prompt
  const correctedOrTranslated = await freeTranslateText(
    input,
    params.nativeLanguage,
    params.targetLanguage,
  );
  const promptNext = ROLEPLAY_OPENERS[mode][params.targetLanguage];

  if (
    correctedOrTranslated &&
    correctedOrTranslated.toLowerCase() !== input.toLowerCase()
  ) {
    return `${promptNext}\n\nVinkki: Voit sanoa saman kohdekielellä näin: "${correctedOrTranslated}"`;
  }

  return `${promptNext}\n\nVinkki: Jatka vastaamalla lyhyellä lauseella kohdekielellä.`;
}
