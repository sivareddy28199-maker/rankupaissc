import type { SupabaseClient } from "@supabase/supabase-js";
import { dailyLimitFor } from "./config";
import type { LearnerContext } from "./ai/prompts";
import { AiLimitError } from "./ai/types";

type Db = SupabaseClient<any, "public", any>;

/** Enforces the per-day AI request budget for the signed-in learner. */
export async function assertWithinAiBudget(supabase: Db, userId: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_tier")
    .eq("id", userId)
    .maybeSingle();
  const limit = dailyLimitFor(profile?.plan_tier);
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const { count } = await supabase
    .from("ai_generations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("success", true)
    .gte("created_at", since.toISOString());
  if ((count ?? 0) >= limit) {
    throw new AiLimitError(
      `You have used all ${limit} AI requests for today. The limit resets at midnight UTC.`,
    );
  }
  return { used: count ?? 0, limit };
}

export async function logGeneration(
  supabase: Db,
  userId: string,
  entry: {
    capability: string;
    provider: string;
    model?: string;
    tokensUsed?: number;
    success: boolean;
    errorMessage?: string;
  },
) {
  await supabase.from("ai_generations").insert({
    user_id: userId,
    capability: entry.capability,
    provider: entry.provider,
    model: entry.model ?? null,
    tokens_used: entry.tokensUsed ?? 0,
    success: entry.success,
    error_message: entry.errorMessage ?? null,
  });
}

/** Builds the real learner context that every AI feature is personalised with. */
export async function buildLearnerContext(supabase: Db, userId: string): Promise<LearnerContext> {
  const [{ data: profile }, { data: practice }, { data: attempts }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase
      .from("practice_answers")
      .select("is_correct, question_id, questions(topic_id, topics(name))")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("test_attempts")
      .select("score, max_marks, accuracy, status")
      .eq("user_id", userId)
      .eq("status", "submitted"),
  ]);

  const rows = (practice ?? []) as any[];
  const total = rows.length;
  const correct = rows.filter((r) => r.is_correct).length;
  const byTopic = new Map<string, { c: number; t: number }>();
  for (const row of rows) {
    const name = row.questions?.topics?.name;
    if (!name) continue;
    const acc = byTopic.get(name) ?? { c: 0, t: 0 };
    acc.t += 1;
    if (row.is_correct) acc.c += 1;
    byTopic.set(name, acc);
  }
  const ranked = [...byTopic.entries()]
    .filter(([, v]) => v.t >= 3)
    .map(([name, v]) => ({ name, acc: (v.c / v.t) * 100 }))
    .sort((a, b) => a.acc - b.acc);

  const submitted = (attempts ?? []) as any[];
  const avgScore = submitted.length
    ? Math.round(
        (submitted.reduce(
          (sum, a) => sum + (a.max_marks > 0 ? (Number(a.score) / Number(a.max_marks)) * 100 : 0),
          0,
        ) /
          submitted.length) *
          10,
      ) / 10
    : 0;

  return {
    fullName: profile?.full_name ?? null,
    examName: profile?.target_exam_code ?? "SSC-CGL",
    targetYear: profile?.target_year ?? new Date().getFullYear() + 1,
    targetDate: profile?.target_date ?? null,
    studyLevel: profile?.study_level ?? "beginner",
    dailyMinutes: profile?.daily_minutes_goal ?? 90,
    accuracy: total ? Math.round((correct / total) * 1000) / 10 : 0,
    questionsAttempted: total,
    testsCompleted: submitted.length,
    averageScore: avgScore,
    weakTopics: ranked.slice(0, 5).map((r) => `${r.name} (${Math.round(r.acc)}%)`),
    strongTopics: ranked
      .slice(-3)
      .reverse()
      .filter((r) => r.acc >= 70)
      .map((r) => `${r.name} (${Math.round(r.acc)}%)`),
  };
}
