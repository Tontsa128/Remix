import type { RoleplayId } from "@/data/lessons";
import type { LanguageCode, LearnerLevel, TutorMessage } from "@/types/elovio";

export async function sendTutorChat(params: {
  nativeLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  level: LearnerLevel;
  roleplay: RoleplayId;
  messages: TutorMessage[];
}): Promise<string> {
  const res = await fetch("/api/tutor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "chat",
      nativeLanguage: params.nativeLanguage,
      targetLanguage: params.targetLanguage,
      level: params.level,
      roleplay: params.roleplay,
      messages: params.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    reply?: string;
    message?: string;
  };

  if (!res.ok || !data.reply) {
    throw new Error(
      data.message || "Opettaja ei juuri nyt pystynyt vastaamaan.",
    );
  }

  return data.reply;
}

export async function explainTextOrImage(params: {
  nativeLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  level: LearnerLevel;
  text: string;
  imageBase64?: string | undefined;
  imageMimeType?: "image/jpeg" | "image/png" | "image/webp" | undefined;
}): Promise<string> {
  const res = await fetch("/api/tutor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "explain",
      nativeLanguage: params.nativeLanguage,
      targetLanguage: params.targetLanguage,
      level: params.level,
      text: params.text,
      imageBase64: params.imageBase64,
      imageMimeType: params.imageMimeType,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    reply?: string;
    message?: string;
  };

  if (!res.ok || !data.reply) {
    throw new Error(
      data.message || "Selitystä ei voitu hakea. Yritä uudelleen.",
    );
  }

  return data.reply;
}
