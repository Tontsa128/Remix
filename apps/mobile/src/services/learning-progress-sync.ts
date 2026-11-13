import {
  createLocalLearningSnapshot,
  mergeLearningProgressSnapshots,
  type LearningProgressRow,
  type LearningProgressSnapshot,
} from "./learning-progress-snapshot";
import {
  saveLocalLearningProgress,
} from "./local-learning-progress";
import {
  saveVisualVocabularyProgress,
} from "./local-visual-vocabulary-progress";
import { saveStudyDays } from "./local-learning-activity";
import { supabase } from "../lib/supabase";

function persistSnapshot(snapshot: LearningProgressSnapshot): void {
  const learningSaved = saveLocalLearningProgress(snapshot.learning);
  const visualSaved = saveVisualVocabularyProgress(snapshot.visualVocabulary);
  const studySaved = saveStudyDays(snapshot.studyDays);
  if (!learningSaved || !visualSaved || !studySaved) {
    throw new Error("Oppimistietojen tallentaminen tälle laitteelle epäonnistui.");
  }
}

export async function syncLearningProgress(userId: string): Promise<LearningProgressSnapshot> {
  if (!supabase) throw new Error("Supabase-yhteyttä ei ole määritetty.");
  if (!userId.trim()) throw new Error("Kirjautuneen käyttäjän tunniste puuttuu.");

  const local = createLocalLearningSnapshot();
  const { data, error } = await supabase
    .from("learner_progress")
    .select("schema_version,progress")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;

  const remoteRow = data as LearningProgressRow | null;
  if (remoteRow && remoteRow.schema_version !== 1) {
    throw new Error("Pilveen tallennettu oppimistietojen versio ei ole tuettu.");
  }

  const merged = mergeLearningProgressSnapshots(local, remoteRow?.progress ?? null);
  persistSnapshot(merged);

  const { error: saveError } = await supabase
    .from("learner_progress")
    .upsert({
      user_id: userId,
      schema_version: 1,
      progress: merged,
    }, { onConflict: "user_id" });

  if (saveError) throw saveError;
  return merged;
}
